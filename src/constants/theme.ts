// src/constants/theme.ts
// Theme system for light/dark mode support
// Uses semantic color names that map to actual color values based on theme

import { COLORS } from './colors';

export type Theme = 'light' | 'dark';

/**
 * Semantic color tokens that map to actual colors based on theme
 * This structure allows easy theme switching in the future
 */
export type ThemeColorToken =
  | 'bg-primary'
  | 'bg-secondary'
  | 'bg-tertiary'
  | 'bg-hover'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
  | 'text-inverse'
  | 'border-default'
  | 'border-focus'
  | 'border-error';

/**
 * Theme configuration mapping semantic tokens to color values
 */
export const THEMES: Record<Theme, Record<ThemeColorToken, string>> = {
  light: {
    'bg-primary': COLORS.WHITE,
    'bg-secondary': COLORS.GRAY_50,
    'bg-tertiary': COLORS.GRAY_100,
    'bg-hover': COLORS.GRAY_100,
    'text-primary': COLORS.GRAY_900,
    'text-secondary': COLORS.GRAY_600,
    'text-muted': COLORS.GRAY_500,
    'text-inverse': COLORS.WHITE,
    'border-default': COLORS.GRAY_300,
    'border-focus': COLORS.PRIMARY,
    'border-error': COLORS.ERROR,
  },
  dark: {
    // Dark theme colors - to be implemented in the future
    'bg-primary': COLORS.GRAY_900,
    'bg-secondary': COLORS.GRAY_800,
    'bg-tertiary': COLORS.GRAY_700,
    'bg-hover': COLORS.GRAY_700,
    'text-primary': COLORS.WHITE,
    'text-secondary': COLORS.GRAY_400,
    'text-muted': COLORS.GRAY_500,
    'text-inverse': COLORS.GRAY_900,
    'border-default': COLORS.GRAY_600,
    'border-focus': COLORS.PRIMARY_LIGHT,
    'border-error': COLORS.ERROR_MEDIUM,
  },
} as const;

/**
 * Get the current theme (defaults to 'light' for now)
 * In the future, this can read from user preferences or system settings
 */
export function getCurrentTheme(): Theme {
  // TODO: Read from user preferences or system settings
  return 'light';
}

/**
 * Get a semantic color value for the current theme
 */
export function getThemeColor(token: ThemeColorToken, theme?: Theme): string {
  const activeTheme = theme || getCurrentTheme();
  return THEMES[activeTheme][token];
}

