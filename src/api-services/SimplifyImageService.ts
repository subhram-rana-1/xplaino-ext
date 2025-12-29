// src/api-services/SimplifyImageService.ts
// Service for image simplification API with SSE streaming

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

// Types
export interface SimplifyImageCallbacks {
  onChunk: (chunk: string, accumulated: string) => void;
  onComplete: (simplifiedText: string, shouldAllowSimplifyMore: boolean, possibleQuestions: string[]) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired: () => void;
  onSubscriptionRequired?: () => void;
}

export interface SimplifyImageChunkEvent {
  chunk: string;
  accumulatedSimplifiedText: string;
}

export interface SimplifyImageCompleteEvent {
  type: 'complete';
  simplifiedText: string;
  shouldAllowSimplifyMore: boolean;
  possibleQuestions?: string[];
}

export interface SimplifyImageErrorEvent {
  type: 'error';
  error_code: string;
  error_message: string;
}

export type SimplifyImageEvent = SimplifyImageChunkEvent | SimplifyImageCompleteEvent | SimplifyImageErrorEvent;

/**
 * Service for handling image simplification API calls with SSE streaming
 */
export class SimplifyImageService {
  private static readonly ENDPOINT = '/api/v2/simplify-image';

  /**
   * Simplify image with SSE streaming
   */
  static async simplify(
    imageFile: File | Blob,
    previousSimplifiedTexts: string[],
    languageCode: string | undefined,
    callbacks: SimplifyImageCallbacks,
    abortController?: AbortController
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('SimplifyImageService');

    // Create FormData
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('previousSimplifiedTexts', JSON.stringify(previousSimplifiedTexts));
    if (languageCode) {
      formData.append('languageCode', languageCode);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          ...authHeaders,
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
        signal: abortController?.signal,
        credentials: 'include',
      });

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'SimplifyImageService');

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
                  'Accept': 'text/event-stream',
                  ...authHeaders,
                },
                body: formData,
                signal: abortController?.signal,
                credentials: 'include',
              },
              'SimplifyImageService'
            );

            // Handle 401 errors on retry
            if (retryResponse.status === 401) {
              const retryErrorData = await ApiResponseHandler.parseErrorResponse(retryResponse);
              if (ApiResponseHandler.checkLoginRequired(retryErrorData, retryResponse.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyImageService');
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
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyImageService');
                return;
              }
              
              // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
              if (ApiResponseHandler.checkSubscriptionRequired(errorData, retryResponse.status)) {
                ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SimplifyImageService');
                return;
              }
              
              // Extract error code and message from response body
              const errorCode = errorData?.error_code || 'HTTP_ERROR';
              const errorMessage = errorData?.error_message || errorData?.detail || (typeof errorData === 'string' ? errorData : `HTTP ${retryResponse.status}`);
              callbacks.onError(errorCode, errorMessage);
              return;
            }

            // Process SSE stream from retry response
            const reader = retryResponse.body?.getReader();
            if (!reader) {
              callbacks.onError('STREAM_ERROR', 'Failed to get response reader');
              return;
            }

            await this.processSSEStream(reader, callbacks);
            return; // Successfully processed retry response
          } catch (refreshError) {
            console.error('[SimplifyImageService] Token refresh failed:', refreshError);
            // Handle refresh failure
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED, etc.)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyImageService');
          return;
        }
        callbacks.onError('AUTH_ERROR', 'Authentication failed');
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for LOGIN_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyImageService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SimplifyImageService');
          return;
        }
        
        // Extract error code and message from response body
        const errorCode = errorData?.error_code || 'HTTP_ERROR';
        const errorMessage = errorData?.error_message || errorData?.detail || (typeof errorData === 'string' ? errorData : `HTTP ${response.status}`);
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      // Handle SSE streaming
      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('STREAM_ERROR', 'Failed to get response reader');
        return;
      }

      await this.processSSEStream(reader, callbacks);
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

  /**
   * Process SSE stream events
   */
  private static async processSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: SimplifyImageCallbacks
  ): Promise<void> {
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
            const event = JSON.parse(data) as SimplifyImageEvent;
            
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
                  ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SimplifyImageService');
                } else if (ApiResponseHandler.checkSubscriptionRequired(errorData, 0)) {
                  ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SimplifyImageService');
                } else {
                  callbacks.onError(event.error_code, event.error_message);
                }
              }
            } else if ('chunk' in event && 'accumulatedSimplifiedText' in event) {
              // Chunk event
              callbacks.onChunk(event.chunk, event.accumulatedSimplifiedText);
            }
          } catch (parseError) {
            console.error('[SimplifyImageService] Failed to parse SSE event:', data, parseError);
          }
        }
      }
    }
  }
}

