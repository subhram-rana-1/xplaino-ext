// src/api-services/AuthService.ts
// Authentication service using Chrome Identity API and backend auth

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { ApiResponseHandler } from './ApiResponseHandler';

// Types
export interface UserInfo {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  picture?: string;
  role?: string;
}

export interface LoginResponse {
  isLoggedIn: boolean;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  userSessionPk: string;
  user: UserInfo;
}

export interface LogoutResponse {
  isLoggedIn: boolean;
  accessToken: string;
  accessTokenExpiresAt: number;
  userSessionPk: string;
  user: UserInfo;
}

export interface AuthInfo {
  isLoggedIn?: boolean;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
  userSessionPk?: string;
  user?: UserInfo;
}

/**
 * Authentication service for Google OAuth via Chrome Identity API
 */
export class AuthService {
  private static readonly LOGIN_ENDPOINT = '/api/auth/login';
  private static readonly LOGOUT_ENDPOINT = '/api/auth/logout';

  /**
   * Get Google OAuth URL for Chrome Identity web auth flow
   * Constructs redirect URL manually since chrome.identity.getRedirectURL() is not available in content scripts
   */
  private static getGoogleAuthUrl(): string {
    const clientId = ENV.GOOGLE_OAUTH_CLIENT_ID;
    
    // Construct redirect URL manually (chrome.identity.getRedirectURL() not available in content scripts)
    // Format: https://<extension-id>.chromiumapp.org/
    const extensionId = chrome.runtime.id;
    const redirectUri = `https://${extensionId}.chromiumapp.org/`;
    
    const scopes = ['openid', 'email', 'profile'].join(' ');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: scopes,
      nonce: Math.random().toString(36).substring(2),
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Login with Google using Chrome Identity API
   * Uses message passing to background script since chrome.identity is not available in content scripts
   * Returns the login response on success
   */
  static async loginWithGoogle(): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      const authUrl = this.getGoogleAuthUrl();

      // Send message to background script to handle OAuth flow
      // chrome.identity.launchWebAuthFlow() is only available in background/service worker scripts
      chrome.runtime.sendMessage(
        {
          type: 'GOOGLE_LOGIN',
          authUrl: authUrl,
        },
        async (response) => {
          if (chrome.runtime.lastError) {
            console.error('[AuthService] Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message || 'Authentication failed'));
            return;
          }

          if (response?.error) {
            reject(new Error(response.error));
            return;
          }

          const idToken = response?.idToken;
          if (!idToken) {
            reject(new Error('Failed to extract ID token from response'));
            return;
          }

          try {
            // Call backend login API
            const loginResponse = await this.callLoginAPI(idToken);
            
            // Save auth info to Chrome storage
            await this.saveAuthInfo(loginResponse);
            
            resolve(loginResponse);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Call backend login API with Google ID token
   */
  private static async callLoginAPI(idToken: string): Promise<LoginResponse> {
    const url = `${ENV.API_BASE_URL}${this.LOGIN_ENDPOINT}`;

    // Include unauthenticated user ID if available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source': 'chrome-extension',
    };

    const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
    if (unauthenticatedUserId) {
      headers['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        authVendor: 'GOOGLE',
        idToken: idToken,
      }),
    });

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'AuthService');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data as LoginResponse;
  }

  /**
   * Save auth info to Chrome storage
   */
  private static async saveAuthInfo(loginResponse: LoginResponse): Promise<void> {
    const authInfo: AuthInfo = {
      isLoggedIn: loginResponse.isLoggedIn,
      accessToken: loginResponse.accessToken,
      refreshToken: loginResponse.refreshToken,
      accessTokenExpiresAt: loginResponse.accessTokenExpiresAt,
      refreshTokenExpiresAt: loginResponse.refreshTokenExpiresAt,
      userSessionPk: loginResponse.userSessionPk,
      user: loginResponse.user,
    };

    await ChromeStorage.setAuthInfo(authInfo);
    console.log('[AuthService] Auth info saved to storage');
    
    // Trigger storage change event to update atoms in components
    // This ensures immediate UI updates without waiting for the listener
    chrome.storage.local.set({ [ChromeStorage.KEYS.XPLAINO_AUTH_INFO]: authInfo });
  }

  /**
   * Logout user
   * Calls logout API, then updates auth info in storage with response data (merging with existing fields)
   */
  static async logout(): Promise<LogoutResponse> {
    console.log('[AuthService] logout() called');
    const authInfo = await ChromeStorage.getAuthInfo();
    
    if (!authInfo?.accessToken) {
      console.log('[AuthService] No access token found, throwing error');
      throw new Error('No access token found - user not logged in');
    }

    // Call backend logout API
    const url = `${ENV.API_BASE_URL}${this.LOGOUT_ENDPOINT}`;
    console.log('[AuthService] Calling logout API:', {
      url,
      method: 'POST',
      endpoint: this.LOGOUT_ENDPOINT,
      hasAccessToken: !!authInfo.accessToken,
    });
    
    try {
      // Include unauthenticated user ID if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authInfo.accessToken}`,
      };

      const unauthenticatedUserId = await ChromeStorage.getUnauthenticatedUserId();
      if (unauthenticatedUserId) {
        headers['X-Unauthenticated-User-Id'] = unauthenticatedUserId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          authVendor: 'GOOGLE',
        }),
      });

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'AuthService');

      console.log('[AuthService] Logout API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AuthService] Logout API failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(`Logout failed: ${response.status} - ${errorText}`);
      }

      // Parse logout response
      const logoutResponse = await response.json() as LogoutResponse;
      console.log('[AuthService] Logout response data:', {
        isLoggedIn: logoutResponse.isLoggedIn,
        hasUser: !!logoutResponse.user,
        userSessionPk: logoutResponse.userSessionPk,
      });

      // Merge logout response with existing auth info (preserving all existing fields)
      const updatedAuthInfo: AuthInfo = {
        ...authInfo, // Keep all existing fields (refreshToken, refreshTokenExpiresAt, etc.)
        isLoggedIn: logoutResponse.isLoggedIn,
        accessToken: logoutResponse.accessToken,
        accessTokenExpiresAt: logoutResponse.accessTokenExpiresAt,
        userSessionPk: logoutResponse.userSessionPk,
        user: logoutResponse.user,
      };

      // Update auth info in storage with merged data
      console.log('[AuthService] Updating auth info in storage with merged data');
      await ChromeStorage.setAuthInfo(updatedAuthInfo);
      
      // Trigger storage change event to update atoms in components
      // This ensures immediate UI updates without waiting for the listener
      chrome.storage.local.set({ [ChromeStorage.KEYS.XPLAINO_AUTH_INFO]: updatedAuthInfo });
      
      console.log('[AuthService] User logged out successfully, auth info updated');
      return logoutResponse;
    } catch (error) {
      console.error('[AuthService] Logout API error:', error);
      // Re-throw error so caller can handle it
      throw error;
    }
  }

  /**
   * Check if user is logged in
   */
  static async isLoggedIn(): Promise<boolean> {
    const authInfo = await ChromeStorage.getAuthInfo();
    if (!authInfo?.accessToken) {
      return false;
    }

    // Check if access token is expired
    if (authInfo.accessTokenExpiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (authInfo.accessTokenExpiresAt < now) {
        // Token expired
        return false;
      }
    }

    return true;
  }

  /**
   * Get current user info
   */
  static async getCurrentUser(): Promise<UserInfo | null> {
    const authInfo = await ChromeStorage.getAuthInfo();
    return authInfo?.user || null;
  }
}

