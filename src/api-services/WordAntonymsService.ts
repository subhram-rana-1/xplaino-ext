// src/api-services/WordAntonymsService.ts
// Service for getting antonyms for words

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { TokenRefreshService } from './TokenRefreshService';

export interface WordAntonyms {
  word: string;
  antonyms: string[];
}

export interface AntonymsRequest {
  words: string[];
}

export interface AntonymsResponse {
  antonyms: WordAntonyms[];
}

export interface AntonymsCallbacks {
  onSuccess: (response: AntonymsResponse) => void;
  onError: (errorCode: string, errorMessage: string) => void;
}

/**
 * Service for fetching antonyms for words
 */
export class WordAntonymsService {
  private static readonly ENDPOINT = '/api/v2/get-antonyms';

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
   * Get antonyms for words
   */
  static async getAntonyms(
    request: AntonymsRequest,
    callbacks: AntonymsCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await this.getAuthHeaders();

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

      // Store X-Unauthenticated-User-Id if present in response
      const responseUnauthenticatedUserId = response.headers.get('X-Unauthenticated-User-Id');
      if (responseUnauthenticatedUserId) {
        await ChromeStorage.setUnauthenticatedUserId(responseUnauthenticatedUserId);
      }

      // Handle 401 errors with TOKEN_EXPIRED check
      if (response.status === 401) {
        const responseClone = response.clone();
        const errorData = await responseClone.json().catch(() => ({}));
        
        if (TokenRefreshService.isTokenExpiredError(response.status, errorData)) {
          console.log('[WordAntonymsService] Token expired, attempting refresh');
          
          try {
            const refreshResponse = await TokenRefreshService.refreshAccessToken();
            
            // Retry with new token
            const retryHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
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
              signal: abortSignal,
              credentials: 'include',
            });
            
            // Store X-Unauthenticated-User-Id from retry
            const retryUnauthUserId = retryResponse.headers.get('X-Unauthenticated-User-Id');
            if (retryUnauthUserId) {
              await ChromeStorage.setUnauthenticatedUserId(retryUnauthUserId);
            }
            
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              const errorCode = errorData.error_code || `HTTP_${retryResponse.status}`;
              const errorMessage = errorData.error_message || errorData.detail || retryResponse.statusText;
              callbacks.onError(errorCode, errorMessage);
              return;
            }
            
            const data: AntonymsResponse = await retryResponse.json();
            callbacks.onSuccess(data);
            return;
          } catch (refreshError) {
            console.error('[WordAntonymsService] Token refresh failed:', refreshError);
            await TokenRefreshService.handleTokenRefreshFailure();
            callbacks.onError('AUTH_ERROR', 'Token refresh failed');
            return;
          }
        }
        
        // Handle other 401 errors
        const errorCode = errorData.error_code || 'UNAUTHORIZED';
        const errorMessage = errorData.error_message || errorData.detail || 'Unauthorized';
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.error_code || `HTTP_${response.status}`;
        const errorMessage = errorData.error_message || errorData.detail || response.statusText;
        callbacks.onError(errorCode, errorMessage);
        return;
      }

      const data: AntonymsResponse = await response.json();
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

