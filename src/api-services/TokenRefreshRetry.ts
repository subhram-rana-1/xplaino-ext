// src/api-services/TokenRefreshRetry.ts
// Utility for handling token refresh and retry logic for API requests

import { TokenRefreshService } from './TokenRefreshService';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';

export interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  signal?: AbortSignal | null;
  credentials?: RequestCredentials;
}

/**
 * Utility class for handling token refresh and request retry logic
 */
export class TokenRefreshRetry {
  /**
   * Check if response indicates TOKEN_EXPIRED and should be retried
   * @param response - The HTTP response
   * @param errorData - Parsed error response data
   * @returns true if TOKEN_EXPIRED error detected
   */
  static shouldRetryWithTokenRefresh(response: Response, errorData: any): boolean {
    return TokenRefreshService.isTokenExpiredError(response.status, errorData);
  }

  /**
   * Retry a request with token refresh for regular JSON API requests
   * @param requestConfig - Original request configuration
   * @param serviceName - Service name for logging
   * @returns Promise resolving to the retry response
   * @throws Error if token refresh fails
   */
  static async retryRequestWithTokenRefresh(
    requestConfig: RequestConfig,
    serviceName: string
  ): Promise<Response> {
    console.log(`[${serviceName}] Token expired, attempting refresh`);

    // Refresh the token
    const refreshResponse = await TokenRefreshService.refreshAccessToken();

    // Build retry headers with new token
    const retryHeaders = await ApiHeaders.getAuthHeaders(serviceName);
    
    // Preserve original headers (except Authorization which we'll override)
    if (requestConfig.headers) {
      Object.assign(retryHeaders, requestConfig.headers);
    }
    
    // Override Authorization with new token
    retryHeaders['Authorization'] = `Bearer ${refreshResponse.accessToken}`;

    // Don't set Content-Type if body is FormData (browser will set it with boundary)
    if (requestConfig.body instanceof FormData) {
      delete retryHeaders['Content-Type'];
    } else if (!retryHeaders['Content-Type'] && requestConfig.body) {
      // Set Content-Type for JSON if not already set
      retryHeaders['Content-Type'] = 'application/json';
    }

    // Retry the request
    const retryResponse = await fetch(requestConfig.url, {
      method: requestConfig.method || 'POST',
      headers: retryHeaders,
      body: requestConfig.body,
      signal: requestConfig.signal,
      credentials: requestConfig.credentials,
    });

    // Sync unauthenticated user ID from retry response headers
    await ApiResponseHandler.syncUnauthenticatedUserId(retryResponse, serviceName);

    return retryResponse;
  }

  /**
   * Retry a request with token refresh for SSE streaming requests
   * Same as retryRequestWithTokenRefresh but optimized for SSE responses
   * @param requestConfig - Original request configuration
   * @param serviceName - Service name for logging
   * @returns Promise resolving to the retry response
   * @throws Error if token refresh fails
   */
  static async retrySSERequestWithTokenRefresh(
    requestConfig: RequestConfig,
    serviceName: string
  ): Promise<Response> {
    console.log(`[${serviceName}] Token expired, attempting refresh for SSE request`);

    // Refresh the token
    const refreshResponse = await TokenRefreshService.refreshAccessToken();

    // Build retry headers with new token
    const retryHeaders = await ApiHeaders.getAuthHeaders(serviceName);
    
    // Preserve original headers (except Authorization which we'll override)
    if (requestConfig.headers) {
      Object.assign(retryHeaders, requestConfig.headers);
    }
    
    // Override Authorization with new token
    retryHeaders['Authorization'] = `Bearer ${refreshResponse.accessToken}`;

    // Ensure Accept header is set for SSE
    if (!retryHeaders['Accept']) {
      retryHeaders['Accept'] = 'text/event-stream';
    }

    // Don't set Content-Type if body is FormData (browser will set it with boundary)
    if (requestConfig.body instanceof FormData) {
      delete retryHeaders['Content-Type'];
    } else if (!retryHeaders['Content-Type'] && requestConfig.body) {
      // Set Content-Type for JSON if not already set
      retryHeaders['Content-Type'] = 'application/json';
    }

    // Retry the request
    const retryResponse = await fetch(requestConfig.url, {
      method: requestConfig.method || 'POST',
      headers: retryHeaders,
      body: requestConfig.body,
      signal: requestConfig.signal,
      credentials: requestConfig.credentials,
    });

    // Sync unauthenticated user ID from retry response headers
    await ApiResponseHandler.syncUnauthenticatedUserId(retryResponse, serviceName);

    return retryResponse;
  }
}

