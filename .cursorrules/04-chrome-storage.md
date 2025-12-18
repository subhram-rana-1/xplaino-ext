# Chrome Storage Patterns

## Overview

All Chrome storage operations (`chrome.storage.local`) must go through a centralized `ChromeStorage` class. This ensures type safety, consistency, and maintainability.

## Folder Structure

```
src/storage/
└── chrome-local/
    ├── ChromeStorage.ts      # Central storage class
    └── dto/                  # Storage DTOs (statically defined)
        ├── UserSettingsDTO.ts
        ├── SavedWordsDTO.ts
        ├── SessionDataDTO.ts
        └── index.ts          # Barrel exports
```

## ChromeStorage Class Pattern

### Complete Implementation

```typescript
// src/storage/chrome-local/ChromeStorage.ts
import {
  UserSettingsDTO,
  SavedWordsDTO,
  SessionDataDTO,
} from './dto';

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
  // Add methods for each DTO type here
  // ============================================

  // --- User Settings ---
  static async getUserSettings(): Promise<UserSettingsDTO | null> {
    return this.get<UserSettingsDTO>(this.KEYS.USER_SETTINGS);
  }

  static async setUserSettings(settings: UserSettingsDTO): Promise<void> {
    return this.set(this.KEYS.USER_SETTINGS, {
      ...settings,
      updatedAt: Date.now(),
    });
  }

  static async removeUserSettings(): Promise<void> {
    return this.remove(this.KEYS.USER_SETTINGS);
  }

  // --- Saved Words ---
  static async getSavedWords(): Promise<SavedWordsDTO | null> {
    return this.get<SavedWordsDTO>(this.KEYS.SAVED_WORDS);
  }

  static async setSavedWords(words: SavedWordsDTO): Promise<void> {
    return this.set(this.KEYS.SAVED_WORDS, {
      ...words,
      lastModified: Date.now(),
    });
  }

  static async addSavedWord(word: SavedWordsDTO['words'][0]): Promise<void> {
    const current = await this.getSavedWords();
    const words = current?.words ?? [];
    
    // Avoid duplicates
    if (!words.some(w => w.word === word.word)) {
      await this.setSavedWords({
        words: [...words, word],
        lastModified: Date.now(),
      });
    }
  }

  static async removeSavedWord(word: string): Promise<void> {
    const current = await this.getSavedWords();
    if (current) {
      await this.setSavedWords({
        words: current.words.filter(w => w.word !== word),
        lastModified: Date.now(),
      });
    }
  }

  // --- Session Data ---
  static async getSessionData(): Promise<SessionDataDTO | null> {
    return this.get<SessionDataDTO>(this.KEYS.SESSION_DATA);
  }

  static async setSessionData(data: SessionDataDTO): Promise<void> {
    return this.set(this.KEYS.SESSION_DATA, data);
  }

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
}
```

## DTO Patterns

### DTO Design Rules

1. **All DTOs must be statically defined** in `src/storage/chrome-local/dto/`
2. **Use interfaces** for DTO definitions
3. **Include timestamps** where appropriate (`createdAt`, `updatedAt`, `lastModified`)
4. **Use descriptive names** with `DTO` suffix

### UserSettingsDTO Example

```typescript
// src/storage/chrome-local/dto/UserSettingsDTO.ts

export interface UserSettingsDTO {
  /** Color theme preference */
  theme: 'light' | 'dark';
  
  /** User's preferred language */
  language: string;
  
  /** Auto-save preference */
  autoSave: boolean;
  
  /** Font size preference */
  fontSize: 'small' | 'medium' | 'large';
  
  /** Timestamp when settings were created */
  createdAt: number;
  
  /** Timestamp when settings were last updated */
  updatedAt: number;
}

/** Default user settings */
export const DEFAULT_USER_SETTINGS: UserSettingsDTO = {
  theme: 'light',
  language: 'en',
  autoSave: true,
  fontSize: 'medium',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### SavedWordsDTO Example

```typescript
// src/storage/chrome-local/dto/SavedWordsDTO.ts

export interface SavedWordItem {
  /** The word itself */
  word: string;
  
  /** AI-generated explanation */
  explanation: string;
  
  /** Example sentences */
  examples?: string[];
  
  /** Word complexity level */
  complexity?: 'easy' | 'medium' | 'hard';
  
  /** Timestamp when word was saved */
  savedAt: number;
}

export interface SavedWordsDTO {
  /** Array of saved words with explanations */
  words: SavedWordItem[];
  
  /** Timestamp when list was last modified */
  lastModified: number;
}

/** Default saved words (empty) */
export const DEFAULT_SAVED_WORDS: SavedWordsDTO = {
  words: [],
  lastModified: Date.now(),
};
```

### SessionDataDTO Example

```typescript
// src/storage/chrome-local/dto/SessionDataDTO.ts

export interface SessionDataDTO {
  /** Currently selected text */
  selectedText?: string;
  
  /** Currently selected words */
  selectedWords: string[];
  
  /** Active tab ID */
  activeTabId?: number;
  
  /** Current page URL */
  currentUrl?: string;
  
  /** Session start timestamp */
  startedAt: number;
}
```

### Barrel Export

```typescript
// src/storage/chrome-local/dto/index.ts

export * from './UserSettingsDTO';
export * from './SavedWordsDTO';
export * from './SessionDataDTO';
```

## Usage Examples

### In Components

```typescript
import React, { useEffect, useState } from 'react';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import type { UserSettingsDTO } from '@/storage/chrome-local/dto';
import { DEFAULT_USER_SETTINGS } from '@/storage/chrome-local/dto';

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<UserSettingsDTO>(DEFAULT_USER_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      const stored = await ChromeStorage.getUserSettings();
      if (stored) {
        setSettings(stored);
      }
    };
    loadSettings();
  }, []);

  const updateTheme = async (theme: 'light' | 'dark') => {
    const newSettings = { ...settings, theme };
    await ChromeStorage.setUserSettings(newSettings);
    setSettings(newSettings);
  };

  return (
    <div>
      <button onClick={() => updateTheme('light')}>Light</button>
      <button onClick={() => updateTheme('dark')}>Dark</button>
    </div>
  );
};
```

### With Jotai Atoms

```typescript
// src/store/settingsAtoms.ts
import { atom } from 'jotai';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import type { UserSettingsDTO } from '@/storage/chrome-local/dto';
import { DEFAULT_USER_SETTINGS } from '@/storage/chrome-local/dto';

export const settingsAtom = atom<UserSettingsDTO>(DEFAULT_USER_SETTINGS);

export const loadSettingsAtom = atom(
  null,
  async (get, set) => {
    const settings = await ChromeStorage.getUserSettings();
    set(settingsAtom, settings ?? DEFAULT_USER_SETTINGS);
  }
);

export const updateSettingsAtom = atom(
  null,
  async (get, set, updates: Partial<UserSettingsDTO>) => {
    const current = get(settingsAtom);
    const newSettings = { ...current, ...updates, updatedAt: Date.now() };
    await ChromeStorage.setUserSettings(newSettings);
    set(settingsAtom, newSettings);
  }
);
```

## Best Practices

### 1. Always Use Type-Safe Methods

```typescript
// ✅ Good: Use type-safe methods
const settings = await ChromeStorage.getUserSettings();

// ❌ Bad: Direct generic access
const settings = await ChromeStorage.get<UserSettingsDTO>('user_settings');
```

### 2. Handle Null Values

```typescript
// ✅ Good: Handle null with defaults
const settings = await ChromeStorage.getUserSettings();
const theme = settings?.theme ?? 'light';

// Or use default constants
import { DEFAULT_USER_SETTINGS } from '@/storage/chrome-local/dto';
const settings = await ChromeStorage.getUserSettings() ?? DEFAULT_USER_SETTINGS;
```

### 3. Add New Keys to KEYS Object

When adding new storage keys:

```typescript
static readonly KEYS = {
  // ... existing keys
  NEW_FEATURE_DATA: 'new_feature_data', // Add here
} as const;
```

### 4. Create Type-Safe Methods for New DTOs

For each new DTO, add corresponding getter/setter methods:

```typescript
// Add DTO
// src/storage/chrome-local/dto/NewFeatureDTO.ts

// Add methods to ChromeStorage
static async getNewFeatureData(): Promise<NewFeatureDTO | null> {
  return this.get<NewFeatureDTO>(this.KEYS.NEW_FEATURE_DATA);
}

static async setNewFeatureData(data: NewFeatureDTO): Promise<void> {
  return this.set(this.KEYS.NEW_FEATURE_DATA, data);
}
```

