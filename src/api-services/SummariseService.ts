// src/api-services/SummariseService.ts
// Service for summarization API with SSE streaming

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

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
  onSubscriptionRequired?: () => void;
}

/**
 * Service for handling summarization API calls with SSE streaming
 */
export class SummariseService {
  private static readonly ENDPOINT = '/api/v2/summarise';

  /**
   * Summarise text with SSE streaming
   */
  static async summarise(
    request: SummariseRequest,
    callbacks: SummariseCallbacks,
    abortController?: AbortController
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('SummariseService');

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
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'SummariseService');

      // Handle 401 errors
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for TOKEN_EXPIRED error code
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
              'SummariseService'
            );

            // Handle 401 errors on retry
            if (retryResponse.status === 401) {
              const retryErrorData = await ApiResponseHandler.parseErrorResponse(retryResponse);
              if (ApiResponseHandler.checkLoginRequired(retryErrorData, retryResponse.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SummariseService');
                return;
              }
              callbacks.onError('AUTH_ERROR', 'Authentication failed');
              return;
            }

            // If retry successful, continue with SSE stream processing
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              callbacks.onError('HTTP_ERROR', `HTTP ${retryResponse.status}: ${errorText}`);
              return;
            }

            // Process SSE stream from retry response
            const reader = retryResponse.body?.getReader();
            if (!reader) {
              callbacks.onError('STREAM_ERROR', 'Failed to get response reader');
              return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                // Check if aborted before reading
                if (abortController?.signal.aborted) {
                  console.log('[SummariseService] Abort detected in retry, cancelling reader');
                  await reader.cancel();
                  return;
                }

                const { done, value } = await reader.read();
                
                if (done) {
                  break;
                }

                // Check if aborted after reading
                if (abortController?.signal.aborted) {
                  console.log('[SummariseService] Abort detected after retry read, cancelling reader');
                  await reader.cancel();
                  return;
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
                          const errorData = { error_code: event.error_code };
                          if (ApiResponseHandler.checkLoginRequired(errorData, 0)) {
                            ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SummariseService');
                          } else if (ApiResponseHandler.checkSubscriptionRequired(errorData, 0)) {
                            ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SummariseService');
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
            } finally {
              reader.releaseLock();
            }
            return; // Successfully processed retry response
          } catch (refreshError) {
            console.error('[SummariseService] Token refresh failed:', refreshError);
            // Handle refresh failure
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED, etc.)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SummariseService');
          return;
        }
        callbacks.onError('AUTH_ERROR', 'Authentication failed');
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for LOGIN_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SummariseService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SummariseService');
          return;
        }
        
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

      try {
        while (true) {
          // Check if aborted before reading
          if (abortController?.signal.aborted) {
            console.log('[SummariseService] Abort detected, cancelling reader');
            await reader.cancel();
            return;
          }

          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          // Check if aborted after reading
          if (abortController?.signal.aborted) {
            console.log('[SummariseService] Abort detected after read, cancelling reader');
            await reader.cancel();
            return;
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
                    const errorData = { error_code: event.error_code };
                    if (ApiResponseHandler.checkLoginRequired(errorData, 0)) {
                      ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SummariseService');
                    } else if (ApiResponseHandler.checkSubscriptionRequired(errorData, 0)) {
                      ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SummariseService');
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
      } finally {
        // Ensure reader is released
        reader.releaseLock();
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

