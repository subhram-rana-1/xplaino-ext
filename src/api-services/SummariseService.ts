// src/api-services/SummariseService.ts
// Service for summarization API with SSE streaming

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';

// Types
export interface SummariseRequest {
  text: string;
  context_type: 'PAGE' | 'TEXT';
  languageCode?: string;
}

export interface SummariseChunkEvent {
  chunk: string;
  accumulated: string;
}

export interface SummariseCompleteEvent {
  type: 'complete';
  summary: string;
  possibleQuestions: string[];
}

export interface SummariseErrorEvent {
  type: 'error';
  error_code: string;
  error_message: string;
}

export type SummariseEvent = SummariseChunkEvent | SummariseCompleteEvent | SummariseErrorEvent;

export interface SummariseCallbacks {
  onChunk: (chunk: string, accumulated: string) => void;
  onComplete: (summary: string, possibleQuestions: string[]) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired: () => void;
}

/**
 * Service for handling summarization API calls with SSE streaming
 */
export class SummariseService {
  private static readonly ENDPOINT = '/api/v2/summarise';

  /**
   * Get authorization headers if auth info exists
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const authInfo = await ChromeStorage.getAuthInfo();
    if (authInfo?.accessToken) {
      return {
        'Authorization': `Bearer ${authInfo.accessToken}`,
      };
    }
    return {};
  }

  /**
   * Summarise text with SSE streaming
   */
  static async summarise(
    request: SummariseRequest,
    callbacks: SummariseCallbacks,
    abortController?: AbortController
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await this.getAuthHeaders();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...authHeaders,
        },
        body: JSON.stringify(request),
        signal: abortController?.signal,
        credentials: 'include',
      });

      // Handle 401 errors
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error_code === 'LOGIN_REQUIRED' || errorData.detail?.includes('LOGIN_REQUIRED')) {
          callbacks.onLoginRequired();
          return;
        }
        callbacks.onError('AUTH_ERROR', 'Authentication failed');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        callbacks.onError('HTTP_ERROR', `HTTP ${response.status}: ${errorText}`);
        return;
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('STREAM_ERROR', 'Failed to get response reader');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            // Check for done signal
            if (data === '[DONE]') {
              continue;
            }

            try {
              const event = JSON.parse(data) as SummariseEvent;
              
              // Handle different event types
              if ('type' in event) {
                if (event.type === 'complete') {
                  callbacks.onComplete(event.summary, event.possibleQuestions);
                } else if (event.type === 'error') {
                  if (event.error_code === 'LOGIN_REQUIRED') {
                    callbacks.onLoginRequired();
                  } else {
                    callbacks.onError(event.error_code, event.error_message);
                  }
                }
              } else if ('chunk' in event) {
                // Chunk event
                callbacks.onChunk(event.chunk, event.accumulated);
              }
            } catch (parseError) {
              console.error('[SummariseService] Failed to parse SSE event:', data, parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Request was aborted, don't call error callback
          return;
        }
        callbacks.onError('NETWORK_ERROR', error.message);
      } else {
        callbacks.onError('UNKNOWN_ERROR', 'An unknown error occurred');
      }
    }
  }
}

