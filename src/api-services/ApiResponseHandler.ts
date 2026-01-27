// src/api-services/ApiResponseHandler.ts
// Utility for handling API responses, including error handling and header syncing

import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { ApiErrorHandler } from './ApiErrorHandler';

/**
 * Utility class for handling API responses
 */
export class ApiResponseHandler {
  /**
   * Sync unauthenticated user ID from response headers to Chrome storage
   * This should be called immediately after receiving a response, before processing the body
   * 
   * @param response - Fetch Response object
   * @param serviceName - Optional service name for logging purposes
   */
  static async syncUnauthenticatedUserId(response: Response, serviceName?: string): Promise<void> {
    const responseUnauthenticatedUserId = response.headers.get('X-Unauthenticated-User-Id');
    if (responseUnauthenticatedUserId) {
      await ChromeStorage.setUnauthenticatedUserId(responseUnauthenticatedUserId);
      const logPrefix = serviceName ? `[${serviceName}]` : '[ApiResponseHandler]';
      console.log(`${logPrefix} Stored unauthenticated user ID from response:`, responseUnauthenticatedUserId);
    }
  }

  /**
   * Check if error response indicates LOGIN_REQUIRED
   * Supports multiple response formats:
   * - errorData.error_code === 'LOGIN_REQUIRED'
   * - errorData.detail?.errorCode === 'LOGIN_REQUIRED'
   * - errorData.detail (string) includes 'LOGIN_REQUIRED'
   * 
   * Note: Checks errorCode in response body regardless of HTTP status code
   * 
   * @param errorData - Error response body (parsed JSON or text)
   * @param _status - HTTP status code (unused, kept for backward compatibility)
   * @returns true if LOGIN_REQUIRED error detected
   */
  static checkLoginRequired(errorData: any, _status: number): boolean {
    // Check for LOGIN_REQUIRED error code (supports multiple response formats)
    if (
      errorData?.error_code === 'LOGIN_REQUIRED' ||
      (typeof errorData?.detail === 'string' && errorData.detail.includes('LOGIN_REQUIRED')) ||
      (typeof errorData?.detail === 'object' && errorData.detail?.errorCode === 'LOGIN_REQUIRED')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if error response indicates SUBSCRIPTION_REQUIRED
   * Supports multiple response formats:
   * - errorData.error_code === 'SUBSCRIPTION_REQUIRED'
   * - errorData.detail?.errorCode === 'SUBSCRIPTION_REQUIRED'
   * - errorData.detail (string) includes 'SUBSCRIPTION_REQUIRED'
   * 
   * Note: Checks errorCode in response body regardless of HTTP status code
   * 
   * @param errorData - Error response body (parsed JSON or text)
   * @param _status - HTTP status code (unused, kept for backward compatibility)
   * @returns true if SUBSCRIPTION_REQUIRED error detected
   */
  static checkSubscriptionRequired(errorData: any, _status: number): boolean {
    // Check for SUBSCRIPTION_REQUIRED error code (supports multiple response formats)
    if (
      errorData?.error_code === 'SUBSCRIPTION_REQUIRED' ||
      (typeof errorData?.detail === 'string' && errorData.detail.includes('SUBSCRIPTION_REQUIRED')) ||
      (typeof errorData?.detail === 'object' && errorData.detail?.errorCode === 'SUBSCRIPTION_REQUIRED')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if error response indicates string_too_long validation error (Pydantic)
   * Checks for Pydantic validation error with type 'string_too_long'
   * 
   * Example error format:
   * {
   *   "detail": [
   *     {
   *       "type": "string_too_long",
   *       "loc": ["body", "text"],
   *       "msg": "String should have at most 50000 characters",
   *       "ctx": { "max_length": 50000 }
   *     }
   *   ]
   * }
   * 
   * @param errorData - Error response body (parsed JSON)
   * @returns Object with isError flag and optional maxLength value
   */
  static checkStringTooLongError(errorData: any): { isError: boolean; maxLength?: number } {
    // Check if error response has the Pydantic validation error structure
    if (errorData?.detail && Array.isArray(errorData.detail)) {
      for (const error of errorData.detail) {
        if (error.type === 'string_too_long') {
          return {
            isError: true,
            maxLength: error.ctx?.max_length || 50000
          };
        }
      }
    }
    return { isError: false };
  }

  /**
   * Handle LOGIN_REQUIRED error
   * Triggers login modal via ApiErrorHandler (global handler) and/or service-specific callback
   * 
   * @param callback - Optional service-specific callback to call (e.g., callbacks.onLoginRequired)
   * @param serviceName - Optional service name for logging purposes
   */
  static handleLoginRequired(callback?: () => void, serviceName?: string): void {
    const logPrefix = serviceName ? `[${serviceName}]` : '[ApiResponseHandler]';
    console.log(`${logPrefix} LOGIN_REQUIRED error detected, triggering login modal`);
    
    // Trigger global handler (if registered)
    ApiErrorHandler.triggerLoginRequired();
    
    // Call service-specific callback if provided
    if (callback) {
      callback();
    }
  }

  /**
   * Handle SUBSCRIPTION_REQUIRED error
   * Triggers subscription modal via ApiErrorHandler (global handler) and/or service-specific callback
   * 
   * @param callback - Optional service-specific callback to call (e.g., callbacks.onSubscriptionRequired)
   * @param serviceName - Optional service name for logging purposes
   */
  static handleSubscriptionRequired(callback?: () => void, serviceName?: string): void {
    const logPrefix = serviceName ? `[${serviceName}]` : '[ApiResponseHandler]';
    console.log(`${logPrefix} SUBSCRIPTION_REQUIRED error detected, triggering subscription modal`);
    
    // Trigger global handler (if registered)
    ApiErrorHandler.triggerSubscriptionRequired();
    
    // Call service-specific callback if provided
    if (callback) {
      callback();
    }
  }

  /**
   * Parse error response body
   * Handles both JSON and text responses
   * 
   * @param response - Fetch Response object
   * @returns Promise resolving to parsed error data
   */
  static async parseErrorResponse(response: Response): Promise<any> {
    try {
      const responseClone = response.clone();
      const errorText = await responseClone.text();
      
      try {
        return JSON.parse(errorText);
      } catch {
        return errorText;
      }
    } catch {
      return {};
    }
  }
}

