// src/api-services/VoiceToTextService.ts
// Service for voice-to-text API calls

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { TokenRefreshService } from './TokenRefreshService';

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
}

/**
 * Service for handling voice-to-text API calls
 */
export class VoiceToTextService {
  private static readonly ENDPOINT = '/api/v2/voice-to-text';

  /**
   * Get authorization headers if auth info exists
   * Also includes X-Unauthenticated-User-Id if available
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    const authInfo = await ChromeStorage.getAuthInfo();
    if (authInfo?.accessToken) {
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;
    }

    // Always include unauthenticated user ID if available
    const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
    if (unauthenticatedUserId) {
      headers['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
    }
    
    return headers;
  }

  /**
   * Convert audio blob to text
   */
  static async voiceToText(
    audioBlob: Blob,
    callbacks: VoiceToTextCallbacks
  ): Promise<void> {
    const url = `${ENV.API_BASE_URL}${this.ENDPOINT}`;
    const authHeaders = await this.getAuthHeaders();

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

      // Check for and store X-Unauthenticated-User-Id from response headers
      const responseUnauthenticatedUserId = response.headers.get('X-Unauthenticated-User-Id');
      if (responseUnauthenticatedUserId) {
        await ChromeStorage.setUnauthenticatedUserId(responseUnauthenticatedUserId);
        console.log('[VoiceToTextService] Stored unauthenticated user ID:', responseUnauthenticatedUserId);
      }

      // Handle 401 errors
      if (response.status === 401) {
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        const errorData = await responseClone.json().catch(() => ({}));
        
        // Check for TOKEN_EXPIRED error code
        if (TokenRefreshService.isTokenExpiredError(response.status, errorData)) {
          console.log('[VoiceToTextService] Token expired, attempting refresh');
          
          try {
            // Refresh the token and get the new access token directly
            const refreshResponse = await TokenRefreshService.refreshAccessToken();
            
            // Retry the request with new token directly from refresh response
            const retryHeaders: Record<string, string> = {
              // Don't set Content-Type header - browser will set it with boundary for FormData
              'Authorization': `Bearer ${refreshResponse.accessToken}`,
            };

            // Always include unauthenticated user ID if available
            const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
            if (unauthenticatedUserId) {
              retryHeaders['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
            }

            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: retryHeaders,
              body: formData,
              credentials: 'include',
            });

            // Check for and store X-Unauthenticated-User-Id from retry response headers
            const retryResponseUnauthUserId = retryResponse.headers.get('X-Unauthenticated-User-Id');
            if (retryResponseUnauthUserId) {
              await ChromeStorage.setUnauthenticatedUserId(retryResponseUnauthUserId);
              console.log('[VoiceToTextService] Stored unauthenticated user ID from retry:', retryResponseUnauthUserId);
            }

            // Handle 401 errors on retry
            if (retryResponse.status === 401) {
              const retryErrorData = await retryResponse.json().catch(() => ({}));
              if (
                retryErrorData.error_code === 'LOGIN_REQUIRED' ||
                (typeof retryErrorData.detail === 'string' && retryErrorData.detail.includes('LOGIN_REQUIRED')) ||
                (typeof retryErrorData.detail === 'object' && retryErrorData.detail?.errorCode === 'LOGIN_REQUIRED')
              ) {
                callbacks.onLoginRequired();
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
        if (
          errorData.error_code === 'LOGIN_REQUIRED' ||
          (typeof errorData.detail === 'string' && errorData.detail.includes('LOGIN_REQUIRED')) ||
          (typeof errorData.detail === 'object' && errorData.detail?.errorCode === 'LOGIN_REQUIRED')
        ) {
          callbacks.onLoginRequired();
          return;
        }
        callbacks.onError('AUTH_ERROR', 'Authentication failed');
        return;
      }

      if (!response.ok) {
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

