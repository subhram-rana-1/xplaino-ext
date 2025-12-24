// src/api-services/ApiHeaders.ts
// Utility for getting authentication headers for API requests

import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';

/**
 * Utility class for generating authentication headers
 */
export class ApiHeaders {
  /**
   * Get authentication headers for API requests
   * Includes Authorization header (if access token available) and X-Unauthenticated-User-Id header (if available)
   * 
   * @param serviceName - Optional service name for logging purposes
   * @returns Promise resolving to headers object
   */
  static async getAuthHeaders(serviceName?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    // Get access token from auth info
    const authInfo = await ChromeStorage.getAuthInfo();
    if (authInfo?.accessToken) {
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;
    }

    // Always include unauthenticated user ID if available
    const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
    if (unauthenticatedUserId) {
      headers['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
      const logPrefix = serviceName ? `[${serviceName}]` : '[ApiHeaders]';
      console.log(`${logPrefix} Including unauthenticated user ID in headers:`, unauthenticatedUserId);
    } else {
      const logPrefix = serviceName ? `[${serviceName}]` : '[ApiHeaders]';
      console.log(`${logPrefix} No unauthenticated user ID found in storage`);
    }
    
    return headers;
  }
}

