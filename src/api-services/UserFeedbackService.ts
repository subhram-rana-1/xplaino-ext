// src/api-services/UserFeedbackService.ts
// Service for submitting user feedback

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';
import type { UserFeedbackRequest, UserFeedbackResponse } from './dto/UserFeedbackDTO';

export interface SubmitFeedbackCallbacks {
  onSuccess: (response: UserFeedbackResponse) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired?: () => void;
}

/**
 * Service for submitting user feedback via POST /api/user-feedback/
 */
export class UserFeedbackService {
  private static readonly ENDPOINT = '/api/user-feedback';

  /**
   * Submit user feedback
   */
  static async submitFeedback(
    request: UserFeedbackRequest,
    callbacks: SubmitFeedbackCallbacks
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}/`;
    const authHeaders = await ApiHeaders.getAuthHeaders('UserFeedbackService');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(request),
        credentials: 'include',
      });

      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'UserFeedbackService');

      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);

        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            const retryResponse = await TokenRefreshRetry.retryRequestWithTokenRefresh(
              {
                url,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeaders,
                },
                credentials: 'include',
              },
              'UserFeedbackService'
            );

            if (!retryResponse.ok) {
              const retryError = await retryResponse.json().catch(() => ({}));
              callbacks.onError(
                retryError.error_code || `HTTP_${retryResponse.status}`,
                retryError.error_message || retryError.detail || retryResponse.statusText
              );
              return;
            }

            const data: UserFeedbackResponse = await retryResponse.json();
            callbacks.onSuccess(data);
            return;
          } catch (refreshError) {
            console.error('[UserFeedbackService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onError('AUTH_ERROR', 'Token refresh failed');
            return;
          }
        }

        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'UserFeedbackService');
          return;
        }

        callbacks.onError(
          errorData.error_code || 'UNAUTHORIZED',
          errorData.error_message || errorData.detail || 'Unauthorized'
        );
        return;
      }

      if (!response.ok) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);

        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'UserFeedbackService');
          return;
        }

        callbacks.onError(
          errorData.error_code || `HTTP_${response.status}`,
          errorData.error_message || errorData.detail || response.statusText
        );
        return;
      }

      const data: UserFeedbackResponse = await response.json();
      callbacks.onSuccess(data);
    } catch (error) {
      callbacks.onError('NETWORK_ERROR', (error as Error).message || 'Network error occurred');
    }
  }
}
