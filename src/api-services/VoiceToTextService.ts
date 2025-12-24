// src/api-services/VoiceToTextService.ts
// Service for voice-to-text API calls

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

// Types
export interface VoiceToTextRequest {
  audio: Blob;
}

export interface VoiceToTextResponse {
  text: string;
}

export interface VoiceToTextCallbacks {
  onSuccess: (text: string) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired: () => void;
  onSubscriptionRequired?: () => void;
}

/**
 * Service for handling voice-to-text API calls
 */
export class VoiceToTextService {
  private static readonly ENDPOINT = '/api/v2/voice-to-text';

  /**
   * Convert audio blob to text
   */
  static async voiceToText(
    audioBlob: Blob,
    callbacks: VoiceToTextCallbacks
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('VoiceToTextService');

    try {
      // Create FormData with audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          // Don't set Content-Type header - browser will set it with boundary for FormData
          ...authHeaders,
        },
        body: formData,
        credentials: 'include',
      });

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'VoiceToTextService');

      // Handle 401 errors
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for TOKEN_EXPIRED error code
        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            // Retry request with token refresh (FormData body will be preserved)
            const retryResponse = await TokenRefreshRetry.retryRequestWithTokenRefresh(
              {
                url,
                method: 'POST',
                headers: authHeaders,
                body: formData,
                credentials: 'include',
              },
              'VoiceToTextService'
            );

            // Handle 401 errors on retry
            if (retryResponse.status === 401) {
              const retryErrorData = await ApiResponseHandler.parseErrorResponse(retryResponse);
              if (ApiResponseHandler.checkLoginRequired(retryErrorData, retryResponse.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'VoiceToTextService');
                return;
              }
              callbacks.onError('AUTH_ERROR', 'Authentication failed');
              return;
            }

            // If retry successful, process response
            if (!retryResponse.ok) {
              const errorText = await retryResponse.text();
              callbacks.onError('HTTP_ERROR', `HTTP ${retryResponse.status}: ${errorText}`);
              return;
            }

            const data = await retryResponse.json() as VoiceToTextResponse;
            callbacks.onSuccess(data.text);
            return; // Successfully processed retry response
          } catch (refreshError) {
            console.error('[VoiceToTextService] Token refresh failed:', refreshError);
            // Handle refresh failure
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED, etc.)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'VoiceToTextService');
          return;
        }
        callbacks.onError('AUTH_ERROR', 'Authentication failed');
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for LOGIN_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'VoiceToTextService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'VoiceToTextService');
          return;
        }
        
        const errorText = await response.text();
        callbacks.onError('HTTP_ERROR', `HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json() as VoiceToTextResponse;
      callbacks.onSuccess(data.text);
    } catch (error) {
      if (error instanceof Error) {
        callbacks.onError('NETWORK_ERROR', error.message);
      } else {
        callbacks.onError('UNKNOWN_ERROR', 'An unknown error occurred');
      }
    }
  }
}

