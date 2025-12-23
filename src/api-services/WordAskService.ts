// src/api-services/WordAskService.ts
// Service for Word-specific Ask API with SSE streaming

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { TokenRefreshService } from './TokenRefreshService';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WordAskRequest {
  question: string;
  chat_history: ChatMessage[];
  initial_context: string;
  context_type: 'TEXT';
  languageCode?: string;
}

export interface WordAskCallbacks {
  onChunk: (chunk: string, accumulated: string) => void;
  onComplete: (chatHistory: ChatMessage[], possibleQuestions: string[]) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired: () => void;
}

/**
 * Service for handling Word Ask API calls with SSE streaming
 */
export class WordAskService {
  private static readonly ENDPOINT = '/api/v2/ask';

  /**
   * Get authorization headers if auth info exists
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    const authInfo = await ChromeStorage.getAuthInfo();
    if (authInfo?.accessToken) {
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;
    }

    const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
    if (unauthenticatedUserId) {
      headers['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
    }
    
    return headers;
  }

  /**
   * Ask a question about a word with SSE streaming
   */
  static async ask(
    request: WordAskRequest,
    callbacks: WordAskCallbacks,
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

      // Check for and store X-Unauthenticated-User-Id from response headers
      const responseUnauthenticatedUserId = response.headers.get('X-Unauthenticated-User-Id');
      if (responseUnauthenticatedUserId) {
        await ChromeStorage.setUnauthenticatedUserId(responseUnauthenticatedUserId);
      }

      // Handle 401 errors with TOKEN_EXPIRED check
      if (response.status === 401) {
        const responseClone = response.clone();
        const errorData = await responseClone.json().catch(() => ({}));
        
        if (TokenRefreshService.isTokenExpiredError(response.status, errorData)) {
          console.log('[WordAskService] Token expired, attempting refresh');
          
          try {
            const refreshResponse = await TokenRefreshService.refreshAccessToken();
            
            // Retry with new token
            const retryHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream',
              'Authorization': `Bearer ${refreshResponse.accessToken}`,
            };
            
            const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
            if (unauthenticatedUserId) {
              retryHeaders['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
            }
            
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: retryHeaders,
              body: JSON.stringify(request),
              signal: abortController?.signal,
              credentials: 'include',
            });
            
            // Store X-Unauthenticated-User-Id from retry
            const retryUnauthUserId = retryResponse.headers.get('X-Unauthenticated-User-Id');
            if (retryUnauthUserId) {
              await ChromeStorage.setUnauthenticatedUserId(retryUnauthUserId);
            }
            
            // Handle 401 on retry
            if (retryResponse.status === 401) {
              callbacks.onLoginRequired();
              return;
            }
            
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              let errorMessage = 'Request failed';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error_message || errorData.detail || errorMessage;
              } catch {}
              callbacks.onError(`HTTP_${retryResponse.status}`, errorMessage);
              return;
            }
            
            // Process SSE stream from retry response
            const reader = retryResponse.body?.getReader();
            if (!reader) {
              callbacks.onError('NO_READER', 'Response body reader not available');
              return;
            }
            
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulated = '';
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6);
                  try {
                    const event = JSON.parse(jsonStr);
                    
                    if ('chunk' in event) {
                      accumulated = event.accumulated || accumulated;
                      callbacks.onChunk(event.chunk, accumulated);
                    } else if (event.type === 'complete') {
                      callbacks.onComplete(
                        event.chat_history || [],
                        event.possibleQuestions || []
                      );
                    } else if (event.type === 'error') {
                      callbacks.onError(
                        event.error_code || 'UNKNOWN_ERROR',
                        event.error_message || 'An error occurred'
                      );
                      return;
                    }
                  } catch (parseError) {
                    console.error('[WordAskService] Failed to parse SSE event:', parseError, jsonStr);
                  }
                }
              }
            }
            return; // Exit after processing retry response
          } catch (refreshError) {
            console.error('[WordAskService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        }
        
        // Handle other 401 errors
        callbacks.onLoginRequired();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.error_code || `HTTP_${response.status}`;
        const errorMessage = errorData.error_message || errorData.detail || response.statusText;
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('NO_READER', 'Response body reader not available');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);

              // Handle chunk events
              if ('chunk' in event) {
                accumulated = event.accumulated || accumulated;
                callbacks.onChunk(event.chunk, accumulated);
              }
              // Handle complete event
              else if (event.type === 'complete') {
                callbacks.onComplete(
                  event.chat_history || [],
                  event.possibleQuestions || []
                );
              }
              // Handle error event
              else if (event.type === 'error') {
                callbacks.onError(
                  event.error_code || 'UNKNOWN_ERROR',
                  event.error_message || 'An error occurred'
                );
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError, jsonStr);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was aborted - this is expected when user clicks stop
        console.log('Word Ask request aborted');
      } else {
        callbacks.onError('NETWORK_ERROR', (error as Error).message || 'Network error occurred');
      }
    }
  }
}

