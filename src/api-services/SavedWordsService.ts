// src/api-services/SavedWordsService.ts
// Service for managing saved words

import { ENV } from '@/config/env';
import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import { TokenRefreshRetry } from './TokenRefreshRetry';

// Types

export interface SaveWordRequest {
  word: string;
  sourceUrl: string;
  contextual_meaning: string | null;
}

export interface SavedWordResponse {
  id: string;
  word: string;
  contextual_meaning: string | null;
  sourceUrl: string;
  userId: string;
  createdAt: string;
}

export interface GetSavedWordsResponse {
  words: SavedWordResponse[];
  total: number;
  offset: number;
  limit: number;
}

export interface SaveWordCallbacks {
  onSuccess: (response: SavedWordResponse) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired?: () => void;
  onSubscriptionRequired?: () => void;
}

export interface RemoveSavedWordCallbacks {
  onSuccess: () => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired?: () => void;
  onSubscriptionRequired?: () => void;
}

export interface GetSavedWordsCallbacks {
  onSuccess: (response: GetSavedWordsResponse) => void;
  onError: (errorCode: string, errorMessage: string) => void;
  onLoginRequired?: () => void;
  onSubscriptionRequired?: () => void;
}

/**
 * Service for managing saved words
 */
export class SavedWordsService {
  private static readonly ENDPOINT = '/api/saved-words';

  /**
   * Save a word
   */
  static async saveWord(
    request: SaveWordRequest,
    callbacks: SaveWordCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('SavedWordsService');

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

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'SavedWordsService');

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
              'SavedWordsService'
            );
            
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              const errorCode = errorData.error_code || `HTTP_${retryResponse.status}`;
              const errorMessage = errorData.error_message || errorData.detail || retryResponse.statusText;
              callbacks.onError(errorCode, errorMessage);
              return;
            }
            
            const data: SavedWordResponse = await retryResponse.json();
            callbacks.onSuccess(data);
            return;
          } catch (refreshError) {
            console.error('[SavedWordsService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onError('AUTH_ERROR', 'Token refresh failed');
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SavedWordsService');
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
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SavedWordsService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SavedWordsService');
          return;
        }
        
        const errorCode = errorData.error_code || `HTTP_${response.status}`;
        const errorMessage = errorData.error_message || errorData.detail || response.statusText;
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      const data: SavedWordResponse = await response.json();
      callbacks.onSuccess(data);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        callbacks.onError('ABORTED', 'Request was aborted');
      } else {
        callbacks.onError('NETWORK_ERROR', (error as Error).message || 'Network error occurred');
      }
    }
  }

  /**
   * Remove a saved word
   */
  static async removeSavedWord(
    wordId: string,
    callbacks: RemoveSavedWordCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}/${wordId}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('SavedWordsService');

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
        },
        signal: abortSignal,
        credentials: 'include',
      });

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'SavedWordsService');

      // Handle 401 errors with TOKEN_EXPIRED check
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            // Retry request with token refresh
            const retryResponse = await TokenRefreshRetry.retryRequestWithTokenRefresh(
              {
                url,
                method: 'DELETE',
                headers: {
                  ...authHeaders,
                },
                signal: abortSignal,
                credentials: 'include',
              },
              'SavedWordsService'
            );
            
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              const errorCode = errorData.error_code || `HTTP_${retryResponse.status}`;
              const errorMessage = errorData.error_message || errorData.detail || retryResponse.statusText;
              callbacks.onError(errorCode, errorMessage);
              return;
            }
            
            callbacks.onSuccess();
            return;
          } catch (refreshError) {
            console.error('[SavedWordsService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onError('AUTH_ERROR', 'Token refresh failed');
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SavedWordsService');
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
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SavedWordsService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SavedWordsService');
          return;
        }
        
        const errorCode = errorData.error_code || `HTTP_${response.status}`;
        const errorMessage = errorData.error_message || errorData.detail || response.statusText;
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      // 204 No Content - success
      callbacks.onSuccess();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        callbacks.onError('ABORTED', 'Request was aborted');
      } else {
        callbacks.onError('NETWORK_ERROR', (error as Error).message || 'Network error occurred');
      }
    }
  }

  /**
   * Get saved words with pagination
   */
  static async getSavedWords(
    offset: number = 0,
    limit: number = 20,
    callbacks: GetSavedWordsCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}?offset=${offset}&limit=${limit}`;
    const authHeaders = await ApiHeaders.getAuthHeaders('SavedWordsService');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...authHeaders,
        },
        signal: abortSignal,
        credentials: 'include',
      });

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'SavedWordsService');

      // Handle 401 errors with TOKEN_EXPIRED check
      if (response.status === 401) {
        const errorData = await ApiResponseHandler.parseErrorResponse(response);
        
        if (TokenRefreshRetry.shouldRetryWithTokenRefresh(response, errorData)) {
          try {
            // Retry request with token refresh
            const retryResponse = await TokenRefreshRetry.retryRequestWithTokenRefresh(
              {
                url,
                method: 'GET',
                headers: {
                  ...authHeaders,
                },
                signal: abortSignal,
                credentials: 'include',
              },
              'SavedWordsService'
            );
            
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              const errorCode = errorData.error_code || `HTTP_${retryResponse.status}`;
              const errorMessage = errorData.error_message || errorData.detail || retryResponse.statusText;
              callbacks.onError(errorCode, errorMessage);
              return;
            }
            
            const data: GetSavedWordsResponse = await retryResponse.json();
            callbacks.onSuccess(data);
            return;
          } catch (refreshError) {
            console.error('[SavedWordsService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onError('AUTH_ERROR', 'Token refresh failed');
            return;
          }
        }
        
        // Handle other 401 errors (LOGIN_REQUIRED)
        if (ApiResponseHandler.checkLoginRequired(errorData, response.status)) {
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SavedWordsService');
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
          ApiResponseHandler.handleLoginRequired(callbacks.onLoginRequired, 'SavedWordsService');
          return;
        }
        
        // Check for SUBSCRIPTION_REQUIRED in error response body (regardless of status code)
        if (ApiResponseHandler.checkSubscriptionRequired(errorData, response.status)) {
          ApiResponseHandler.handleSubscriptionRequired(callbacks.onSubscriptionRequired, 'SavedWordsService');
          return;
        }
        
        const errorCode = errorData.error_code || `HTTP_${response.status}`;
        const errorMessage = errorData.error_message || errorData.detail || response.statusText;
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      const data: GetSavedWordsResponse = await response.json();
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

