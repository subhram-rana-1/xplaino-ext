// src/storage/chrome-local/ChromeStorage.ts

import type { DomainSettingsDTO } from './dto';
import type { DomainStatus } from '@/types/domain';

/**
 * Central class for all chrome.storage.local operations
 * All storage operations must go through this class
 */
export class ChromeStorage {
  // ============================================
  // STATIC STORAGE KEYS
  // Add all storage keys here as static constants
  // ============================================
  static readonly KEYS = {
    USER_SETTINGS: 'user_settings',
    SAVED_WORDS: 'saved_words',
    SESSION_DATA: 'session_data',
    LAST_SYNC: 'last_sync',
    AUTH_TOKEN: 'auth_token',
    EXTENSION_SETTINGS: 'extension_settings',
  } as const;

  // ============================================
  // GENERIC METHODS
  // ============================================

  /**
   * Get a value from chrome.storage.local
   * @param key - Storage key
   * @returns Promise resolving to the value or null
   */
  static async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? null);
      });
    });
  }

  /**
   * Set a value in chrome.storage.local
   * @param key - Storage key
   * @param value - Value to store
   */
  static async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  /**
   * Remove a value from chrome.storage.local
   * @param key - Storage key to remove
   */
  static async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }

  /**
   * Remove multiple values from chrome.storage.local
   * @param keys - Array of storage keys to remove
   */
  static async removeMultiple(keys: string[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    });
  }

  /**
   * Clear all values from chrome.storage.local
   */
  static async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }

  /**
   * Get all stored data
   * @returns Promise resolving to all stored data
   */
  static async getAll(): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
  }

  // ============================================
  // TYPE-SAFE GETTERS AND SETTERS
  // Add methods for each DTO type here as needed
  // ============================================

  // Example placeholder methods - implement with actual DTOs

  // --- Auth Token ---
  static async getAuthToken(): Promise<string | null> {
    return this.get<string>(this.KEYS.AUTH_TOKEN);
  }

  static async setAuthToken(token: string): Promise<void> {
    return this.set(this.KEYS.AUTH_TOKEN, token);
  }

  static async removeAuthToken(): Promise<void> {
    return this.remove(this.KEYS.AUTH_TOKEN);
  }

  // --- Last Sync ---
  static async getLastSync(): Promise<number | null> {
    return this.get<number>(this.KEYS.LAST_SYNC);
  }

  static async setLastSync(timestamp: number = Date.now()): Promise<void> {
    return this.set(this.KEYS.LAST_SYNC, timestamp);
  }

  // --- Extension Settings ---
  static async getExtensionSettings(): Promise<DomainSettingsDTO | null> {
    return this.get<DomainSettingsDTO>(this.KEYS.EXTENSION_SETTINGS);
  }

  static async setExtensionSettings(settings: DomainSettingsDTO): Promise<void> {
    return this.set(this.KEYS.EXTENSION_SETTINGS, settings);
  }

  static async getGlobalDisabled(): Promise<boolean> {
    const settings = await this.getExtensionSettings();
    return settings?.globalDisabled ?? false;
  }

  static async setGlobalDisabled(disabled: boolean): Promise<void> {
    const settings = await this.getExtensionSettings();
    const updatedSettings: DomainSettingsDTO = {
      globalDisabled: disabled,
      domainSettings: settings?.domainSettings ?? {},
    };
    return this.setExtensionSettings(updatedSettings);
  }

  static async getDomainStatus(domain: string): Promise<DomainStatus | null> {
    const settings = await this.getExtensionSettings();
    return settings?.domainSettings[domain] ?? null;
  }

  static async setDomainStatus(domain: string, status: DomainStatus): Promise<void> {
    const settings = await this.getExtensionSettings();
    const updatedSettings: DomainSettingsDTO = {
      globalDisabled: settings?.globalDisabled ?? false,
      domainSettings: {
        ...(settings?.domainSettings ?? {}),
        [domain]: status,
      },
    };
    return this.setExtensionSettings(updatedSettings);
  }

  static async getAllDomainSettings(): Promise<Record<string, DomainStatus>> {
    const settings = await this.getExtensionSettings();
    return settings?.domainSettings ?? {};
  }
}

