// src/storage/chrome-local/dto/UserSettingsDTO.ts

/**
 * User settings storage DTO
 * Stores user preferences for theme, language, and translation view
 */
export interface UserSettingsDTO {
  /** UI language preference */
  language?: string;
  /** Translation view mode: 'none' | 'append' | 'replace' */
  translationView?: 'none' | 'append' | 'replace';
  /** Global theme preference: 'light' | 'dark' */
  globalTheme?: 'light' | 'dark';
  /** Domain-specific theme preferences */
  domainThemes?: Record<string, 'light' | 'dark'>;
}

