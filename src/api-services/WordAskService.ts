// src/api-services/WordAskService.ts
// Service for Word-specific Ask API with SSE streaming

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

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
  onSubscriptionRequired?: () => void;
}

/**
 * Service for handling Word Ask API calls with SSE streaming
 */
export class WordAskService {
  private static readonly ENDPOINT = '/api/v2/ask';

  /**
   * Ask a question about a word with SSE streaming
   */
  static async ask(
    request: WordAskRequest,
    callbacks: WordAskCallbacks,
    abortController?: AbortController
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('WordAskService');

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

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'WordAskService');

      // Handle 401 errors with TOKEN_EXPIRED check
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            // Retry request with token refresh
            const retryResponse = await TokenRefreshRetry.retrySSERequestWithTokenRefresh(
              {
                url,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'text/event-stream',
                  ...authHeaders,
                },
                body: JSON.stringify(request),
                signal: abortController?.signal,
                credentials: 'include',
              },
              'WordAskService'
            );
            
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
                      const errorData = { error_code: event.error_code };
                      if (ApiResponseHandler.checkLoginRequired(errorData, 0)) {
                        ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WordAskService');
                      } else if (ApiResponseHandler.checkSubscriptionRequired(errorData, 0)) {
                        ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'WordAskService');
                      } else {
                        callbacks.onError(
                          event.error_code || 'UNKNOWN_ERROR',
                          event.error_message || 'An error occurred'
                        );
                      }
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
        
        // Handle other 401 errors (LOGIN_REQUIRED, etc.)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WordAskService');
        } else {
          callbacks.onError('AUTH_ERROR', 'Authentication failed');
        }
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for LOGIN_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WordAskService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'WordAskService');
          return;
        }
        
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
                const errorData = { error_code: event.error_code };
                if (ApiResponseHandler.checkLoginRequired(errorData, 0)) {
                  ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'WordAskService');
                } else if (ApiResponseHandler.checkSubscriptionRequired(errorData, 0)) {
                  ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'WordAskService');
                } else {
                  callbacks.onError(
                    event.error_code || 'UNKNOWN_ERROR',
                    event.error_message || 'An error occurred'
                  );
                }
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

