// src/api-services/WebpageChatImageService.ts
// API service for the "Chat with Webpage + Image" feature.
// Calls POST /api/webpage-chat/answer-with-image using multipart/form-data + SSE streaming.

import { ENV } from '@/config/env';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';
import { TokenRefreshService } from './TokenRefreshService';
import type { AnswerCallbacks, ConversationMessage, WebpageChunk, CitationDetail } from './WebpageChatService';

// Re-export CitationDetail so callers don't need two imports
export type { CitationDetail, AnswerCallbacks, ConversationMessage, WebpageChunk };

// =============================================================================
// Helpers
// =============================================================================

/**
 * Translate [N] numbered citation placeholders in prose text back to the
 * [[cite:chunkId1,chunkId2]] format understood by parseAnswerCitations / CitationChip.
 * Only replaces [N] where N is a known citation number in the provided map.
 * Duplicated from WebpageChatService to avoid circular imports.
 */
function translateNumberedCitations(
  text: string,
  citationNumberToChunkIds: Record<number, string[]>
): string {
  return text.replace(/\[(\d+)\]/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    const chunkIds = citationNumberToChunkIds[num];
    if (!chunkIds || chunkIds.length === 0) return match;
    return `[[cite:${chunkIds.join(',')}]]`;
  });
}

async function processSSEStream(
  response: Response,
  callbacks: AnswerCallbacks,
  abortController?: AbortController
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('STREAM_ERROR', 'Failed to get response reader');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  const citationMap: Record<string, CitationDetail> = {};
  const citationNumberToChunkIds: Record<number, string[]> = {};
  let possibleQuestions: string[] = [];

  try {
    // eslint-disable-next-line no-constant-condition
    outer: while (true) {
      if (abortController?.signal.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      if (abortController?.signal.aborted) {
        await reader.cancel();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        // [DONE] signals the stream is complete — commit immediately without
        // waiting for the HTTP connection to close (which can hang with proxies).
        if (data === '[DONE]') {
          break outer;
        }

        try {
          const event = JSON.parse(data) as Record<string, unknown>;
          const evType = event.type as string | undefined;

          if (evType === 'chunk') {
            const text = (event.text as string) ?? '';
            accumulated = (event.accumulated as string) ?? accumulated + text;
            const progressiveAnswer = translateNumberedCitations(accumulated, citationNumberToChunkIds);
            callbacks.onChunk(text, accumulated, progressiveAnswer);
          } else if (evType === 'inline_citation') {
            const citationNumber = event.citationNumber as number;
            const chunkIds = (event.chunkIds as string[]) ?? [];
            const citations = (event.citations as CitationDetail[]) ?? [];
            citationNumberToChunkIds[citationNumber] = chunkIds;
            for (const c of citations) {
              citationMap[c.chunkId] = c;
            }
            callbacks.onInlineCitation?.(citationNumber, chunkIds, citations);
          } else if (evType === 'possible_questions') {
            possibleQuestions = (event.possibleQuestions as string[]) ?? [];
          } else if (evType === 'error') {
            const code = (event.error_code as string) ?? 'UNKNOWN_ERROR';
            const msg = (event.error_message as string) ?? 'An error occurred';
            if (ApiResponseHandler.checkLoginRequired({ error_code: code }, 0)) {
              ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WebpageChatImageService');
            } else {
              callbacks.onError(code, msg);
            }
            return;
          }
        } catch {
          // Ignore malformed SSE data lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Fire onCitations whether we exited via [DONE] or natural stream close.
  const finalAnswer = translateNumberedCitations(accumulated, citationNumberToChunkIds);
  callbacks.onCitations(finalAnswer, citationMap, possibleQuestions);
}

// =============================================================================
// WebpageChatImageService
// =============================================================================

export class WebpageChatImageService {
  private static readonly ENDPOINT = '/api/webpage-chat/answer-with-image';

  /**
   * Ask a question about a webpage image using SSE streaming.
   *
   * Sends multipart/form-data with the image file and page context, streams
   * the answer as Server-Sent Events (same SSE format as /api/webpage-chat/answer).
   *
   * @param imageFile            - The image file (canvas-converted Blob or File)
   * @param question             - The user's question
   * @param questionType         - 'broad' | 'contextual' (image questions default to 'contextual')
   * @param chunks               - Page chunks for context (same as /answer)
   * @param conversationHistory  - Prior turns in this session
   * @param pageUrl              - Current page URL
   * @param pageTitle            - Current page title (optional)
   * @param languageCode         - User's preferred language code (optional)
   * @param callbacks            - SSE callbacks (same interface as WebpageChatService.answer)
   * @param abortController      - Optional AbortController to cancel the stream
   */
  static async answerWithImage(
    imageFile: File | Blob,
    question: string,
    questionType: 'broad' | 'contextual',
    chunks: WebpageChunk[],
    conversationHistory: ConversationMessage[],
    pageUrl: string,
    pageTitle?: string,
    languageCode?: string,
    callbacks: AnswerCallbacks = {
      onChunk: () => {},
      onCitations: () => {},
      onError: () => {},
      onLoginRequired: () => {},
    },
    abortController?: AbortController
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('WebpageChatImageService');

    const buildFormData = (): FormData => {
      const fd = new FormData();
      fd.append('image', imageFile, 'image.jpg');
      fd.append('question', question);
      fd.append('question_type', questionType);
      fd.append('page_url', pageUrl);
      if (pageTitle) fd.append('page_title', pageTitle);
      if (languageCode) fd.append('language_code', languageCode);
      fd.append('chunks', JSON.stringify(chunks));
      fd.append('conversation_history', JSON.stringify(conversationHistory));
      return fd;
    };

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          ...authHeaders,
          // Note: do NOT set Content-Type — browser sets multipart boundary automatically
        },
        body: buildFormData(),
        signal: abortController?.signal,
        credentials: 'include',
      });

      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'WebpageChatImageService');

      // 401 handling with token refresh
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);

        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            response = await TokenRefreshRetry.retrySSERequestWithTokenRefresh(
              {
                url,
                method: 'POST',
                headers: {
                  Accept: 'text/event-stream',
                  ...authHeaders,
                },
                body: buildFormData(),
                signal: abortController?.signal,
                credentials: 'include',
              },
              'WebpageChatImageService'
            );

            if (response.status === 401) {
              const retryErr = await ApiResponseHandler.parseErrorResponse(response);
              if (ApiResponseHandler.checkLoginRequired(retryErr, response.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WebpageChatImageService');
                return;
              }
              callbacks.onError('AUTH_ERROR', 'Authentication failed');
              return;
            }
          } catch {
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        } else if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WebpageChatImageService');
          return;
        } else {
          callbacks.onError('AUTH_ERROR', 'Authentication failed');
          return;
        }
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WebpageChatImageService');
          return;
        }
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'WebpageChatImageService');
          return;
        }
        callbacks.onError(
          errorData?.error_code ?? 'HTTP_ERROR',
          errorData?.error_message ?? `HTTP ${response.status}`
        );
        return;
      }

      await processSSEStream(response, callbacks, abortController);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') return;
        callbacks.onError('NETWORK_ERROR', err.message);
      } else {
        callbacks.onError('UNKNOWN_ERROR', 'An unknown error occurred');
      }
    }
  }
}
