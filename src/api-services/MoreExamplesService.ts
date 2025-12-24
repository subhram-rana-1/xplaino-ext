// src/api-services/MoreExamplesService.ts
// Service for getting more examples for a word

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

export interface MoreExamplesRequest {
  word: string;
  meaning: string;
  examples: string[];
}

export interface MoreExamplesResponse {
  word: string;
  meaning: string;
  examples: string[];
  shouldAllowFetchMoreExamples: boolean;
}

export interface MoreExamplesCallbacks {
  onSuccess: (response: MoreExamplesResponse) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired: () => void;
  onSubscriptionRequired?: () => void;
}

/**
 * Service for fetching more examples for a word
 */
export class MoreExamplesService {
  private static readonly ENDPOINT = '/api/v1/get-more-explanations';

  /**
   * Get more examples for a word
   */
  static async getMoreExamples(
    request: MoreExamplesRequest,
    callbacks: MoreExamplesCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('MoreExamplesService');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(request),
        signal: abortSignal,
        credentials: 'include',
      });

      // Sync unauthenticated user ID from response headers (must be done before processing body)
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'MoreExamplesService');

      // Handle 401 errors with TOKEN_EXPIRED check
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            // Retry request with token refresh
            const retryResponse = await TokenRefreshRetry.retryRequestWithTokenRefresh(
              {
                url,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeaders,
                },
                body: JSON.stringify(request),
                signal: abortSignal,
                credentials: 'include',
              },
              'MoreExamplesService'
            );
            
            if (!retryResponse.ok) {
              const errorData = await ApiResponseHandler.parseErrorResponse(retryResponse);
              
              // Check for LOGIN_REQUIRED in retry response
              if (retryResponse.status === 401 && ApiResponseHandler.checkLoginRequired(errorData, retryResponse.status)) {
                ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'MoreExamplesService');
                return;
              }
              
              const errorCode = errorData?.error_code || `HTTP_${retryResponse.status}`;
              const errorMessage = errorData?.error_message || errorData?.detail || retryResponse.statusText;
              callbacks.onError(errorCode, errorMessage);
              return;
            }
            
            const data: MoreExamplesResponse = await retryResponse.json();
            callbacks.onSuccess(data);
            return;
          } catch (refreshError) {
            console.error('[MoreExamplesService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onLoginRequired();
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED, etc.)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'MoreExamplesService');
          return;
        }
        
        const errorCode = errorData.error_code || 'UNAUTHORIZED';
        const errorMessage = errorData.error_message || errorData.detail || 'Unauthorized';
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        // Check for LOGIN_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'MoreExamplesService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'MoreExamplesService');
          return;
        }
        
        const errorCode = errorData.error_code || `HTTP_${response.status}`;
        const errorMessage = errorData.error_message || errorData.detail || response.statusText;
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      const data: MoreExamplesResponse = await response.json();
      callbacks.onSuccess(data);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        callbacks.onError('ABORTED', 'Request was aborted');
      } else {
        callbacks.onError('NETWORK_ERROR', (error as Error).message || 'Network error occurred');
      }
    }
  }
}

