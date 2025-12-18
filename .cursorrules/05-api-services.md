# API Services Patterns

## Overview

All API calls must go through a centralized `ApiService` class. This ensures consistent error handling, request formatting, and type safety across the application.

## Folder Structure

```
src/api-services/
├── ApiService.ts         # Central API class
└── dto/                  # Request/Response DTOs (statically defined)
    ├── ExplainWordDTO.ts
    ├── GetWordsDTO.ts
    ├── UserDTO.ts
    └── index.ts          # Barrel exports
```

## ApiService Class Pattern

### Complete Implementation

```typescript
// src/api-services/ApiService.ts
import {
  ExplainWordRequestDTO,
  ExplainWordResponseDTO,
  ExplainWordsRequestDTO,
  ExplainWordsResponseDTO,
  GetWordsResponseDTO,
  UserProfileResponseDTO,
} from './dto';

export class ApiService {
  // ============================================
  // CONFIGURATION
  // ============================================
  
  private static readonly BASE_URL = 'https://api.example.com';
  
  // ============================================
  // GENERIC REQUEST METHODS
  // ============================================

  /**
   * Generic request handler with error handling
   * @param endpoint - API endpoint (will be appended to BASE_URL)
   * @param options - Fetch options
   * @returns Promise resolving to response data
   * @throws Error on non-OK response
   */
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.BASE_URL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = await this.getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    return response.json();
  }

  /**
   * GET request helper
   */
  private static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request helper
   */
  private static async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request helper
   */
  private static async put<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request helper
   */
  private static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Get auth token from storage
   */
  private static async getAuthToken(): Promise<string | null> {
    // Import dynamically to avoid circular dependencies
    const { ChromeStorage } = await import('@/storage/chrome-local/ChromeStorage');
    return ChromeStorage.getAuthToken();
  }

  // ============================================
  // API METHODS
  // Add all API calls here with proper typing
  // ============================================

  /**
   * Explain a single word
   * @param request - Word explanation request
   * @returns Promise resolving to explanation response
   */
  static async explainWord(
    request: ExplainWordRequestDTO
  ): Promise<ExplainWordResponseDTO> {
    return this.post<ExplainWordRequestDTO, ExplainWordResponseDTO>(
      '/explain',
      request
    );
  }

  /**
   * Explain multiple words at once
   * @param request - Multiple words explanation request
   * @returns Promise resolving to explanations response
   */
  static async explainWords(
    request: ExplainWordsRequestDTO
  ): Promise<ExplainWordsResponseDTO> {
    return this.post<ExplainWordsRequestDTO, ExplainWordsResponseDTO>(
      '/explain/batch',
      request
    );
  }

  /**
   * Get all saved words for user
   * @returns Promise resolving to words list
   */
  static async getWords(): Promise<GetWordsResponseDTO> {
    return this.get<GetWordsResponseDTO>('/words');
  }

  /**
   * Get user profile
   * @returns Promise resolving to user profile
   */
  static async getUserProfile(): Promise<UserProfileResponseDTO> {
    return this.get<UserProfileResponseDTO>('/user/profile');
  }

  /**
   * Sync local data with server
   * @param data - Data to sync
   */
  static async syncData<T>(data: T): Promise<void> {
    await this.post<T, void>('/sync', data);
  }
}
```

## DTO Patterns

### DTO Design Rules

1. **All DTOs must be statically defined** in `src/api-services/dto/`
2. **Separate Request and Response DTOs** even if similar
3. **Use interfaces** for DTO definitions
4. **Use descriptive names** with `DTO` suffix
5. **Group related DTOs** in the same file

### ExplainWordDTO Example

```typescript
// src/api-services/dto/ExplainWordDTO.ts

/**
 * Request DTO for explaining a single word
 */
export interface ExplainWordRequestDTO {
  /** The word to explain */
  word: string;
  
  /** Optional context sentence containing the word */
  context?: string;
  
  /** Target language for explanation */
  language?: string;
}

/**
 * Response DTO for word explanation
 */
export interface ExplainWordResponseDTO {
  /** The word that was explained */
  word: string;
  
  /** AI-generated explanation */
  explanation: string;
  
  /** Example sentences using the word */
  examples: string[];
  
  /** Complexity level of the word */
  complexity: 'easy' | 'medium' | 'hard';
  
  /** Part of speech */
  partOfSpeech?: string;
  
  /** Synonyms */
  synonyms?: string[];
}

/**
 * Request DTO for explaining multiple words
 */
export interface ExplainWordsRequestDTO {
  /** Array of words to explain */
  words: string[];
  
  /** Optional context for all words */
  context?: string;
  
  /** Target language for explanations */
  language?: string;
}

/**
 * Response DTO for multiple word explanations
 */
export interface ExplainWordsResponseDTO {
  /** Array of explanations */
  explanations: ExplainWordResponseDTO[];
  
  /** Total processing time in ms */
  processingTime?: number;
}
```

### GetWordsDTO Example

```typescript
// src/api-services/dto/GetWordsDTO.ts

/**
 * Single word item in the list
 */
export interface WordItem {
  /** Unique identifier */
  id: string;
  
  /** The word */
  word: string;
  
  /** Word category */
  category: string;
  
  /** When the word was added */
  createdAt: string;
}

/**
 * Response DTO for getting words list
 */
export interface GetWordsResponseDTO {
  /** Array of word items */
  words: WordItem[];
  
  /** Total count of words */
  total: number;
  
  /** Current page (if paginated) */
  page?: number;
  
  /** Items per page (if paginated) */
  perPage?: number;
}
```

### UserDTO Example

```typescript
// src/api-services/dto/UserDTO.ts

/**
 * User profile response DTO
 */
export interface UserProfileResponseDTO {
  /** User ID */
  id: string;
  
  /** User email */
  email: string;
  
  /** Display name */
  name: string;
  
  /** Profile picture URL */
  avatarUrl?: string;
  
  /** Account creation date */
  createdAt: string;
  
  /** Subscription tier */
  tier: 'free' | 'premium' | 'enterprise';
}

/**
 * User update request DTO
 */
export interface UpdateUserRequestDTO {
  /** Updated display name */
  name?: string;
  
  /** Updated avatar URL */
  avatarUrl?: string;
}
```

### Barrel Export

```typescript
// src/api-services/dto/index.ts

export * from './ExplainWordDTO';
export * from './GetWordsDTO';
export * from './UserDTO';
```

## Usage Examples

### In Components

```typescript
import React, { useState } from 'react';
import { ApiService } from '@/api-services/ApiService';
import type { ExplainWordResponseDTO } from '@/api-services/dto';
import { COLORS } from '@/constants/colors';

const WordExplainer: React.FC<{ word: string }> = ({ word }) => {
  const [explanation, setExplanation] = useState<ExplainWordResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ApiService.explainWord({ word });
      setExplanation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to explain word');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleExplain} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Explain'}
      </button>
      
      {error && <p style={{ color: COLORS.ERROR }}>{error}</p>}
      
      {explanation && (
        <div>
          <h3>{explanation.word}</h3>
          <p>{explanation.explanation}</p>
          <span>Complexity: {explanation.complexity}</span>
        </div>
      )}
    </div>
  );
};
```

### With Jotai Atoms

```typescript
// src/store/wordsAtoms.ts
import { atom } from 'jotai';
import { ApiService } from '@/api-services/ApiService';
import type { ExplainWordResponseDTO } from '@/api-services/dto';

export const selectedWordsAtom = atom<string[]>([]);
export const explanationsAtom = atom<ExplainWordResponseDTO[]>([]);
export const isExplainingAtom = atom<boolean>(false);
export const explainErrorAtom = atom<string | null>(null);

export const explainSelectedWordsAtom = atom(
  null,
  async (get, set) => {
    const words = get(selectedWordsAtom);
    if (words.length === 0) return;

    set(isExplainingAtom, true);
    set(explainErrorAtom, null);

    try {
      const response = await ApiService.explainWords({ words });
      set(explanationsAtom, response.explanations);
    } catch (error) {
      set(explainErrorAtom, 
        error instanceof Error ? error.message : 'Failed to explain words'
      );
    } finally {
      set(isExplainingAtom, false);
    }
  }
);
```

## Error Handling

### Standard Error Pattern

```typescript
// In ApiService
private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      // Parse error body if available
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // Use default error message
      }
      throw new ApiError(errorMessage, response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error', 0);
  }
}

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### Usage with Error Handling

```typescript
import { ApiService, ApiError } from '@/api-services/ApiService';

try {
  const result = await ApiService.explainWord({ word: 'example' });
} catch (error) {
  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      // Handle unauthorized
    } else if (error.statusCode === 429) {
      // Handle rate limit
    } else {
      // Handle other errors
    }
  }
}
```

## Best Practices

### 1. Always Use DTOs

```typescript
// ✅ Good: Use defined DTOs
const request: ExplainWordRequestDTO = { word: 'example' };
const response = await ApiService.explainWord(request);

// ❌ Bad: Inline objects without types
const response = await ApiService.explainWord({ word: 'example' });
```

### 2. Handle Loading and Error States

```typescript
// ✅ Good: Proper state handling
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// ❌ Bad: No loading/error handling
const data = await ApiService.getData();
```

### 3. Add New Endpoints to ApiService

When adding new endpoints:

1. Define Request/Response DTOs in `api-services/dto/`
2. Export from `api-services/dto/index.ts`
3. Add method to `ApiService` class with proper typing

```typescript
// 1. Define DTO
// src/api-services/dto/NewFeatureDTO.ts
export interface NewFeatureRequestDTO { ... }
export interface NewFeatureResponseDTO { ... }

// 2. Export
// src/api-services/dto/index.ts
export * from './NewFeatureDTO';

// 3. Add method
// src/api-services/ApiService.ts
static async newFeature(request: NewFeatureRequestDTO): Promise<NewFeatureResponseDTO> {
  return this.post<NewFeatureRequestDTO, NewFeatureResponseDTO>('/new-feature', request);
}
```

