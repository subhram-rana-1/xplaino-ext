// src/api-services/TokenRefreshService.ts
// Service for refreshing access tokens when they expire

import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { ApiHeaders } from './ApiHeaders';
import { ApiResponseHandler } from './ApiResponseHandler';
import type { LoginResponse } from './AuthService';

/**
 * Service for handling token refresh operations
 */
export class TokenRefreshService {
  private static readonly REFRESH_TOKEN_ENDPOINT = '/api/auth/refresh-token';

  /** Lock TTL in ms — if a tab crashes while holding the lock, it auto-expires. */
  private static readonly LOCK_TTL_MS = 15_000;
  /** How often waiting tabs poll Chrome storage for the lock to be released. */
  private static readonly LOCK_POLL_INTERVAL_MS = 200;

  /**
   * Level 1 (intra-tab): in-memory promise mutex.
   * Ensures that concurrent callers inside the same tab share one promise.
   */
  private static refreshPromise: Promise<LoginResponse> | null = null;

  /**
   * Public entry point.
   * Level 1 — in-memory mutex (same-tab concurrency).
   * Level 2 — Chrome storage lock (cross-tab concurrency, e.g. laptop sleep/wake).
   */
  static async refreshAccessToken(): Promise<LoginResponse> {
    if (this.refreshPromise) {
      console.log('[TokenRefreshService] Refresh already in progress in this tab, reusing promise');
      return this.refreshPromise;
    }

    this.refreshPromise = this._refreshWithStorageLock().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /**
   * Level 2 — Chrome storage distributed lock.
   * Tries to acquire the lock; if another tab already holds it, waits for that
   * tab to finish and then reads the fresh tokens from storage.
   */
  private static async _refreshWithStorageLock(): Promise<LoginResponse> {
    const lockId = await this._acquireStorageLock();

    if (!lockId) {
      console.log('[TokenRefreshService] Another tab holds the refresh lock, waiting for it to finish');
      return this._waitForOtherTabRefresh();
    }

    console.log(`[TokenRefreshService] Acquired refresh lock (${lockId})`);
    try {
      return await this._executeRefresh();
    } finally {
      await this._releaseStorageLock(lockId);
      console.log(`[TokenRefreshService] Released refresh lock (${lockId})`);
    }
  }

  /**
   * Try to acquire the Chrome storage lock using an optimistic write-then-verify
   * pattern.  Chrome storage operations are serialized within the extension so
   * the race window is extremely narrow.
   * @returns The lockId string if acquired, null if another tab already holds it.
   */
  private static async _acquireStorageLock(): Promise<string | null> {
    const now = Date.now();
    const existingLock = await ChromeStorage.getTokenRefreshLock();

    // If a live (non-expired) lock exists, don't even attempt
    if (existingLock && now - existingLock.acquiredAt < this.LOCK_TTL_MS) {
      return null;
    }

    // Optimistically write our lock
    const lockId = `${now}-${Math.random().toString(36).slice(2)}`;
    await ChromeStorage.setTokenRefreshLock({ lockId, acquiredAt: now });

    // Re-read to verify we won the race
    const verifyLock = await ChromeStorage.getTokenRefreshLock();
    if (verifyLock?.lockId !== lockId) {
      return null;
    }

    return lockId;
  }

  /**
   * Release the lock only if we still own it (guards against TTL takeovers).
   */
  private static async _releaseStorageLock(lockId: string): Promise<void> {
    const current = await ChromeStorage.getTokenRefreshLock();
    if (current?.lockId === lockId) {
      await ChromeStorage.setTokenRefreshLock(null);
    }
  }

  /**
   * Called by tabs that lost the lock race.
   * Polls every LOCK_POLL_INTERVAL_MS until the winning tab releases the lock,
   * then returns the fresh tokens written to storage by that tab.
   * If the lock never releases within LOCK_TTL_MS (holding tab crashed),
   * this tab takes over and calls _executeRefresh() itself.
   */
  private static async _waitForOtherTabRefresh(): Promise<LoginResponse> {
    const deadline = Date.now() + this.LOCK_TTL_MS;

    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.LOCK_POLL_INTERVAL_MS));

      const lock = await ChromeStorage.getTokenRefreshLock();
      const lockExpiredOrGone = !lock || Date.now() - lock.acquiredAt >= this.LOCK_TTL_MS;

      if (lockExpiredOrGone) {
        // The winning tab has finished (or crashed). Read the fresh tokens.
        const authInfo = await ChromeStorage.getAuthInfo();
        if (authInfo?.accessToken && authInfo?.refreshToken) {
          console.log('[TokenRefreshService] Got fresh tokens from storage after waiting for other tab');
          return {
            isLoggedIn: authInfo.isLoggedIn ?? true,
            accessToken: authInfo.accessToken,
            refreshToken: authInfo.refreshToken,
            accessTokenExpiresAt: authInfo.accessTokenExpiresAt ?? 0,
            refreshTokenExpiresAt: authInfo.refreshTokenExpiresAt ?? 0,
            userSessionPk: authInfo.userSessionPk ?? '',
            user: authInfo.user ?? { id: '', name: '', email: '' },
          } as LoginResponse;
        }

        // Storage has no valid tokens — the other tab's refresh must have failed.
        // Try to do the refresh ourselves.
        console.log('[TokenRefreshService] Lock released but no fresh tokens found, attempting own refresh');
        return this._executeRefresh();
      }
    }

    // Deadline exceeded — holding tab likely crashed. Take over.
    console.warn('[TokenRefreshService] Lock TTL exceeded, taking over refresh');
    await ChromeStorage.setTokenRefreshLock(null);
    return this._executeRefresh();
  }

  /**
   * The actual refresh API call. No locking logic here.
   */
  private static async _executeRefresh(): Promise<LoginResponse> {
    console.log('[TokenRefreshService] Starting token refresh');

    // Get current auth info from storage
    const authInfo = await ChromeStorage.getAuthInfo();
    
    if (!authInfo?.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!authInfo?.accessToken) {
      throw new Error('No access token available');
    }

    const url = `${ENV.API_BASE_URL}${this.REFRESH_TOKEN_ENDPOINT}`;

    try {
      // Build headers with auth token and unauthenticated user ID
      const headers = await ApiHeaders.getAuthHeaders('TokenRefreshService');
      headers['Content-Type'] = 'application/json';
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          refreshToken: authInfo.refreshToken,
        }),
      });

      if (!response.ok) {
        // Clone response to read body without consuming it
        const responseClone = response.clone();
        const errorText = await responseClone.text();
        let errorBody: any;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = errorText;
        }

        console.error('[TokenRefreshService] Refresh token API failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          errorBody,
        });

        // Check for LOGIN_REQUIRED error code
        if (response.status === 401 && ApiResponseHandler.checkLoginRequired(errorBody, response.status)) {
          console.log('[TokenRefreshService] LOGIN_REQUIRED error, showing login modal');
          // Handle login required - remove auth info and show login modal
          await this.handleTokenRefreshFailure();
        }

        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      // Sync unauthenticated user ID from response headers
      await ApiResponseHandler.syncUnauthenticatedUserId(response, 'TokenRefreshService');

      const data = await response.json() as LoginResponse;
      console.log('[TokenRefreshService] Token refresh successful');

      // Update chrome storage with new tokens
      // ChromeStorage.setAuthInfo already handles the storage update properly
      await ChromeStorage.setAuthInfo({
        isLoggedIn: data.isLoggedIn,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        userSessionPk: data.userSessionPk,
        user: data.user,
      });

      // Trigger storage change event to update atoms in components
      // This ensures immediate UI updates without waiting for the listener
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ 
          [ChromeStorage.KEYS.XPLAINO_AUTH_INFO]: {
            isLoggedIn: data.isLoggedIn,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accessTokenExpiresAt: data.accessTokenExpiresAt,
            refreshTokenExpiresAt: data.refreshTokenExpiresAt,
            userSessionPk: data.userSessionPk,
            user: data.user,
          }
        }, () => {
          resolve();
        });
      });

      return data;
    } catch (error) {
      console.error('[TokenRefreshService] Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Handle token refresh failure
   * Removes auth info from storage and triggers login modal
   */
  static async handleTokenRefreshFailure(): Promise<void> {
    console.log('[TokenRefreshService] Handling token refresh failure');

    // Remove auth info from chrome storage
    await ChromeStorage.removeAuthInfo();

    // Trigger login modal by setting a flag in chrome.storage
    // The content script will listen for this and show the login modal
    await chrome.storage.local.set({ 
      'xplaino_show_login_modal': true 
    });

    // Also dispatch a custom event that content scripts can listen to
    // This is a fallback mechanism (only works in window context)
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('xplaino:login-required'));
      } catch (error) {
        // Ignore errors if window.dispatchEvent is not available
        console.warn('[TokenRefreshService] Could not dispatch login-required event:', error);
      }
    }
  }

  /**
   * Check if error response indicates token expiration
   * @param status - HTTP status code
   * @param errorBody - Error response body (parsed JSON or text)
   * @returns true if error is TOKEN_EXPIRED
   */
  static isTokenExpiredError(status: number, errorBody: any): boolean {
    if (status !== 401) {
      return false;
    }

    // Check for TOKEN_EXPIRED error code
    if (errorBody?.detail?.errorCode === 'TOKEN_EXPIRED') {
      return true;
    }

    return false;
  }
}

