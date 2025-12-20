// src/api-services/AuthService.ts
// Authentication service using Chrome Identity API and backend auth

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';

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

export interface AuthInfo {
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'chrome-extension',
      },
      body: JSON.stringify({
        authVendor: 'GOOGLE',
        idToken: idToken,
      }),
    });

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
   * Calls logout API first, then removes auth info from storage only if API call succeeds
   */
  static async logout(): Promise<void> {
    console.log('[AuthService] logout() called');
    const authInfo = await ChromeStorage.getAuthInfo();
    
    if (!authInfo?.accessToken) {
      console.log('[AuthService] No access token found, clearing storage if any exists');
      // No auth info, just clear storage if any exists
      await ChromeStorage.removeAuthInfo();
      return;
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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authInfo.accessToken}`,
        },
        body: JSON.stringify({
          authVendor: 'GOOGLE',
        }),
      });

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

      // Only remove auth info from storage if API call succeeds
      console.log('[AuthService] Logout API succeeded, removing auth info from storage');
      await ChromeStorage.removeAuthInfo();
      console.log('[AuthService] User logged out successfully');
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

