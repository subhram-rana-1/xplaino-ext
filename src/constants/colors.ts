// src/constants/colors.ts
// Colors synced from xplaino-web project

export const COLORS = {
  // ============================================
  // PRIMARY COLORS (Purple theme - from xplaino-web)
  // ============================================
  PRIMARY: '#9527F5',           // Main purple
  PRIMARY_LIGHT: '#BF7EFA',     // Medium purple
  PRIMARY_LIGHT_ALT: '#B66DFF', // Alternative light purple variant
  PRIMARY_VERY_LIGHT: '#eaddf8', // Very light purple
  PRIMARY_DARK: '#8607f5',      // Darker purple
  PRIMARY_HOVER: '#BF7EFA',     // Hover state purple
  PRIMARY_HOVER_DARK: '#7c1ed9', // Dark hover state
  PRIMARY_HOVER_ALT: '#7d1fd4',  // Alternative hover variant

  // ============================================
  // SECONDARY COLORS (Green theme - from xplaino-web)
  // ============================================
  SECONDARY: '#10B981',         // Main green
  SECONDARY_LIGHT: '#D1FAE5',   // Light green
  SECONDARY_MEDIUM: '#34D399', // Medium green
  SECONDARY_SUCCESS: '#4CAF50', // Success green
  SECONDARY_SUCCESS_DARK: '#45a049', // Dark success green

  // ============================================
  // NEUTRAL COLORS
  // ============================================
  WHITE: '#FFFFFF',
  BLACK: '#000000',

  // Gray scale (standard)
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F7FAFC',
  GRAY_200: '#EDF2F7',
  GRAY_300: '#E2E8F0',
  GRAY_400: '#CBD5E0',
  GRAY_500: '#A0AEC0',
  GRAY_600: '#718096',
  GRAY_700: '#4A5568',
  GRAY_800: '#2D3748',
  GRAY_900: '#1A202C',

  // Gray scale (alternative variants found in codebase)
  GRAY_200_ALT: '#e5e7eb',      // Alternative gray-200
  GRAY_300_ALT: '#d1d5db',      // Alternative gray-300
  GRAY_600_ALT: '#6b7280',      // Alternative gray-600
  GRAY_700_ALT: '#374151',      // Alternative gray-700
  GRAY_800_ALT: '#111827',      // Alternative gray-800 (very dark)
  GRAY_DARK: '#333',            // Dark gray (shorthand)
  GRAY_LIGHT: '#ccc',           // Light gray (shorthand)

  // ============================================
  // SEMANTIC COLORS (synced with xplaino-web)
  // ============================================
  SUCCESS: '#10B981',           // Main success green
  SUCCESS_LIGHT: '#D1FAE5',     // Light success green
  SUCCESS_MEDIUM: '#34D399',    // Medium success green

  ERROR: '#EF4444',             // Main error red
  ERROR_LIGHT: '#FEE2E2',       // Light error red
  ERROR_MEDIUM: '#F87171',      // Medium error red
  ERROR_DARK: '#DC2626',        // Dark error red
  ERROR_ALT: '#ff4444',         // Alternative error red
  ERROR_DARK_ALT: '#cc0000',    // Dark alternative error red

  WARNING: '#ED8936',
  WARNING_LIGHT: '#FBD38D',
  WARNING_DARK: '#C05621',

  INFO: '#4299E1',
  INFO_LIGHT: '#90CDF4',
  INFO_DARK: '#2B6CB0',

  // ============================================
  // BACKGROUND COLORS
  // ============================================
  BACKGROUND_PRIMARY: '#FFFFFF',
  BACKGROUND_SECONDARY: '#F7FAFC',
  BACKGROUND_TERTIARY: '#EDF2F7',
  BACKGROUND_DARK: '#1A202C',
  BACKGROUND_GRAY_50: '#F9FAFB',
  BACKGROUND_GRAY_100: '#F3F4F6',
  BACKGROUND_GRAY_200: '#E5E7EB',
  BACKGROUND_PURPLE_TINT_1: '#ede9fe', // Purple-tinted background
  BACKGROUND_PURPLE_TINT_2: '#ddd6fe', // Purple-tinted background variant
  BACKGROUND_PURPLE_TINT_3: '#f3e8ff', // Purple-tinted background variant

  // ============================================
  // TEXT COLORS
  // ============================================
  TEXT_PRIMARY: '#1A202C',
  TEXT_SECONDARY: '#718096',
  TEXT_MUTED: '#A0AEC0',
  TEXT_INVERSE: '#FFFFFF',
  TEXT_LINK: '#4299E1',
  TEXT_DARK: '#333',            // Dark text (shorthand)
  TEXT_GRAY_700: '#374151',     // Gray-700 text
  TEXT_GRAY_800: '#111827',     // Gray-800 text

  // ============================================
  // BORDER COLORS
  // ============================================
  BORDER_DEFAULT: '#E2E8F0',
  BORDER_FOCUS: '#4299E1',
  BORDER_ERROR: '#F56565',
  BORDER_GRAY_200: '#e5e7eb',   // Gray-200 border
  BORDER_GRAY_300: '#d1d5db',   // Gray-300 border

  // ============================================
  // OVERLAY COLORS
  // ============================================
  OVERLAY: 'rgba(0, 0, 0, 0.5)',
  OVERLAY_LIGHT: 'rgba(0, 0, 0, 0.3)',
  OVERLAY_DARK: 'rgba(26, 32, 44, 0.9)', // Dark overlay with gray-900

  // ============================================
  // PRIMARY COLOR OPACITY VARIANTS (for shadows, backgrounds, borders)
  // ============================================
  PRIMARY_OPACITY_5: 'rgba(149, 39, 245, 0.05)',
  PRIMARY_OPACITY_10: 'rgba(149, 39, 245, 0.1)',
  PRIMARY_OPACITY_15: 'rgba(149, 39, 245, 0.15)',
  PRIMARY_OPACITY_20: 'rgba(149, 39, 245, 0.2)',
  PRIMARY_OPACITY_25: 'rgba(149, 39, 245, 0.25)',
  PRIMARY_OPACITY_30: 'rgba(149, 39, 245, 0.3)',
  PRIMARY_OPACITY_35: 'rgba(149, 39, 245, 0.35)',
  PRIMARY_OPACITY_40: 'rgba(149, 39, 245, 0.4)',
  PRIMARY_OPACITY_50: 'rgba(149, 39, 245, 0.5)',
  PRIMARY_OPACITY_60: 'rgba(149, 39, 245, 0.6)',
  PRIMARY_OPACITY_80: 'rgba(149, 39, 245, 0.8)',

  // ============================================
  // SECONDARY/SUCCESS COLOR OPACITY VARIANTS
  // ============================================
  SUCCESS_OPACITY_15: 'rgba(0, 200, 0, 0.15)',
  SUCCESS_OPACITY_25: 'rgba(0, 200, 0, 0.25)',
  SUCCESS_OPACITY_30: 'rgba(144, 238, 144, 0.3)',
  SUCCESS_OPACITY_50: 'rgba(0, 200, 0, 0.5)',
  SUCCESS_OPACITY_80: 'rgba(0, 200, 0, 0.8)',

  // ============================================
  // ERROR COLOR OPACITY VARIANTS
  // ============================================
  ERROR_OPACITY_10: 'rgba(255, 68, 68, 0.1)',
  ERROR_OPACITY_10_ALT: 'rgba(239, 68, 68, 0.1)',

  // ============================================
  // WHITE OPACITY VARIANTS
  // ============================================
  WHITE_OPACITY_30: 'rgba(255, 255, 255, 0.3)',

  // ============================================
  // SHADOW COLORS
  // ============================================
  SHADOW_BLACK_20: 'rgba(0, 0, 0, 0.2)',
} as const;

// Type for color keys
export type ColorKey = keyof typeof COLORS;

// Type for color values
export type ColorValue = (typeof COLORS)[ColorKey];

