// src/api-services/SimplifyService.ts
// Service for text simplification API with SSE streaming

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

// Types
export interface SimplifyRequest {
  textStartIndex: number;
  textLength: number;
  text: string;
  previousSimplifiedTexts: string[];
  context?: string;
  languageCode?: string;
}

export interface SimplifyChunkEvent {
  chunk: string;
  accumulatedSimplifiedText: string;
  textStartIndex: number;
  textLength: number;
  text: string;
  previousSimplifiedTexts: string[];
}

export interface SimplifyCompleteEvent {
  type: 'complete';
  textStartIndex: number;
  textLength: number;
  text: string;
  previousSimplifiedTexts: string[];
  simplifiedText: string;
  shouldAllowSimplifyMore: boolean;
  possibleQuestions?: string[];
}

export interface SimplifyErrorEvent {
  type: 'error';
  error_code: string;
  error_message: string;
}

export type SimplifyEvent = SimplifyChunkEvent | SimplifyCompleteEvent | SimplifyErrorEvent;

export interface SimplifyCallbacks {
  onChunk: (chunk: string, accumulated: string) => void;
  onComplete: (simplifiedText: string, shouldAllowSimplifyMore: boolean, possibleQuestions: string[]) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired: () => void;
  onSubscriptionRequired?: () => void;
}

/**
 * Service for handling text simplification API calls with SSE streaming
 */
export class SimplifyService {
  private static readonly ENDPOINT = '/api/v2/simplify';

  /**
   * Simplify text with SSE streaming
   */
  static async simplify(
    request: SimplifyRequest[],
    callbacks: SimplifyCallbacks,
    abortController?: AbortController
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('SimplifyService');

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
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'SimplifyService');

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
              'SimplifyService'
            );

            // Handle 401 errors on retry
            if (retryResponse.status === 401) {
              const retryErrorData = await ApiResponseHandler.parseErrorResponse(retryResponse);
              if (ApiResponseHandler.checkLoginRequired(retryErrorData, retryResponse.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyService');
                return;
              }
              callbacks.onError('AUTH_ERROR', 'Authentication failed');
              return;
            }

            // If retry successful, continue with SSE stream processing
            if (!retryResponse.ok) {
              const errorData = await ApiResponseHandler.parseErrorResponse(retryResponse);
              
              // Check for LOGIN_REQUIRED in error response body (regardless of status code)
              if (ApiResponseHandler.checkLoginRequired(errorData, retryResponse.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyService');
                return;
              }
              
              // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
              if (ApiResponseHandler.checkSubscriptionRequired(errorData, retryResponse.status)) {
                ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SimplifyService');
                return;
              }
              
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
                    const event = JSON.parse(data) as SimplifyEvent;
                    
                    // Handle different event types
                    if ('type' in event) {
                      if (event.type === 'complete') {
                        callbacks.onComplete(
                          event.simplifiedText,
                          event.shouldAllowSimplifyMore,
                          event.possibleQuestions || []
                        );
                      } else if (event.type === 'error') {
                        if (ApiResponseHandler.checkLoginRequired({ error_code: event.error_code }, 401)) {
                          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyService');
                        } else {
                          callbacks.onError(event.error_code, event.error_message);
                        }
                      }
                    } else if ('chunk' in event && 'accumulatedSimplifiedText' in event) {
                      // Chunk event
                      callbacks.onChunk(event.chunk, event.accumulatedSimplifiedText);
                    }
                  } catch (parseError) {
                    console.error('[SimplifyService] Failed to parse SSE event:', data, parseError);
                  }
                }
              }
            }
            return; // Successfully processed retry response
          } catch (refreshError) {
            console.error('[SimplifyService] Token refresh failed:', refreshError);
            // Handle refresh failure
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED, etc.)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyService');
          return;
        }
        callbacks.onError('AUTH_ERROR', 'Authentication failed');
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for LOGIN_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SimplifyService');
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
              const event = JSON.parse(data) as SimplifyEvent;
              
              // Handle different event types
              if ('type' in event) {
                if (event.type === 'complete') {
                  callbacks.onComplete(
                    event.simplifiedText,
                    event.shouldAllowSimplifyMore,
                    event.possibleQuestions || []
                  );
                } else if (event.type === 'error') {
                  const errorData = { error_code: event.error_code };
                  if (ApiResponseHandler.checkLoginRequired(errorData, 0)) {
                    ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyService');
                  } else if (ApiResponseHandler.checkSubscriptionRequired(errorData, 0)) {
                    ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SimplifyService');
                  } else {
                    callbacks.onError(event.error_code, event.error_message);
                  }
                }
              } else if ('chunk' in event && 'accumulatedSimplifiedText' in event) {
                // Chunk event
                callbacks.onChunk(event.chunk, event.accumulatedSimplifiedText);
              }
            } catch (parseError) {
              console.error('[SimplifyService] Failed to parse SSE event:', data, parseError);
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



