# Styling and Colors

## Color Management

### Golden Rule

**NEVER hardcode hex/rgb values directly in components. ALL colors MUST be defined as constants.**

### Color Constants Location

All colors MUST be defined in `src/constants/colors.ts`

### Color Constants Pattern

```typescript
// src/constants/colors.ts

export const COLORS = {
  // ============================================
  // PRIMARY COLORS
  // ============================================
  PRIMARY: '#6B46C1',
  PRIMARY_LIGHT: '#9F7AEA',
  PRIMARY_DARK: '#553C9A',
  PRIMARY_HOVER: '#805AD5',
  
  // ============================================
  // SECONDARY COLORS
  // ============================================
  SECONDARY: '#38B2AC',
  SECONDARY_LIGHT: '#81E6D9',
  SECONDARY_DARK: '#2C7A7B',
  
  // ============================================
  // NEUTRAL COLORS
  // ============================================
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  
  // Gray scale
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
  
  // ============================================
  // SEMANTIC COLORS
  // ============================================
  SUCCESS: '#48BB78',
  SUCCESS_LIGHT: '#9AE6B4',
  SUCCESS_DARK: '#276749',
  
  ERROR: '#F56565',
  ERROR_LIGHT: '#FEB2B2',
  ERROR_DARK: '#C53030',
  
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
  
  // ============================================
  // TEXT COLORS
  // ============================================
  TEXT_PRIMARY: '#1A202C',
  TEXT_SECONDARY: '#718096',
  TEXT_MUTED: '#A0AEC0',
  TEXT_INVERSE: '#FFFFFF',
  TEXT_LINK: '#4299E1',
  
  // ============================================
  // BORDER COLORS
  // ============================================
  BORDER_DEFAULT: '#E2E8F0',
  BORDER_FOCUS: '#4299E1',
  BORDER_ERROR: '#F56565',
  
  // ============================================
  // OVERLAY COLORS
  // ============================================
  OVERLAY: 'rgba(0, 0, 0, 0.5)',
  OVERLAY_LIGHT: 'rgba(0, 0, 0, 0.3)',
  
} as const;

// Type for color keys
export type ColorKey = keyof typeof COLORS;

// Type for color values
export type ColorValue = typeof COLORS[ColorKey];
```

### Adding New Colors

When you need a new color:

1. **Add to `COLORS` constant first**
2. Use descriptive, semantic names
3. Group with related colors
4. Never use hex values directly in components

```typescript
// ✅ Good: Add to constants first
// In colors.ts
HIGHLIGHT_YELLOW: '#FEFCBF',
HIGHLIGHT_GREEN: '#C6F6D5',

// Then use in component
<span style={{ backgroundColor: COLORS.HIGHLIGHT_YELLOW }}>highlighted</span>

// ❌ Bad: Hardcoded color
<span style={{ backgroundColor: '#FEFCBF' }}>highlighted</span>
```

## Usage in Components

### Inline Styles

```typescript
import { COLORS } from '@/constants/colors';

const MyComponent: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: COLORS.BACKGROUND_PRIMARY,
        color: COLORS.TEXT_PRIMARY,
        borderColor: COLORS.BORDER_DEFAULT,
        border: `1px solid ${COLORS.BORDER_DEFAULT}`,
      }}
    >
      <h1 style={{ color: COLORS.PRIMARY }}>Title</h1>
      <p style={{ color: COLORS.TEXT_SECONDARY }}>Description</p>
    </div>
  );
};
```

### Style Objects

```typescript
import { COLORS } from '@/constants/colors';
import { BORDER_RADIUS } from '@/constants/styles';

const styles = {
  container: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: BORDER_RADIUS.LARGE,
    padding: '24px',
  },
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: '24px',
    fontWeight: 'bold',
  },
  description: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: '16px',
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    color: COLORS.WHITE,
    borderRadius: BORDER_RADIUS.MEDIUM,
    padding: '12px 24px',
    border: 'none',
    cursor: 'pointer',
  },
  buttonHover: {
    backgroundColor: COLORS.PRIMARY_HOVER,
  },
};
```

### CSS Modules with CSS Variables

```typescript
// Component.tsx
import { COLORS } from '@/constants/colors';
import styles from './Component.module.css';

const Component: React.FC = () => {
  const cssVars = {
    '--color-primary': COLORS.PRIMARY,
    '--color-text': COLORS.TEXT_PRIMARY,
    '--color-bg': COLORS.BACKGROUND_PRIMARY,
  } as React.CSSProperties;

  return (
    <div className={styles.container} style={cssVars}>
      <h1 className={styles.title}>Title</h1>
    </div>
  );
};
```

```css
/* Component.module.css */
.container {
  background-color: var(--color-bg);
  padding: 24px;
}

.title {
  color: var(--color-primary);
}
```

## Border Radius

### Border Radius Constants

```typescript
// src/constants/styles.ts

export const BORDER_RADIUS = {
  /** Cards, modals, panels, large containers */
  LARGE: '30px',
  
  /** Buttons, inputs, dropdowns */
  MEDIUM: '10px',
  
  /** Badges, tags, chips, small elements */
  SMALL: '6px',
  
  /** Circular elements (avatars, icons) */
  ROUND: '50%',
  
  /** No border radius */
  NONE: '0px',
} as const;

export type BorderRadiusKey = keyof typeof BORDER_RADIUS;
```

### Border Radius Usage

| Element Type | Constant | Value |
|--------------|----------|-------|
| Cards | `BORDER_RADIUS.LARGE` | 30px |
| Modals | `BORDER_RADIUS.LARGE` | 30px |
| Panels | `BORDER_RADIUS.LARGE` | 30px |
| Containers | `BORDER_RADIUS.LARGE` | 30px |
| Buttons | `BORDER_RADIUS.MEDIUM` | 10px |
| Inputs | `BORDER_RADIUS.MEDIUM` | 10px |
| Dropdowns | `BORDER_RADIUS.MEDIUM` | 10px |
| Badges | `BORDER_RADIUS.SMALL` | 6px |
| Tags | `BORDER_RADIUS.SMALL` | 6px |
| Chips | `BORDER_RADIUS.SMALL` | 6px |
| Avatars | `BORDER_RADIUS.ROUND` | 50% |

### Examples

```typescript
import { COLORS } from '@/constants/colors';
import { BORDER_RADIUS } from '@/constants/styles';

// Card - 30px radius
const cardStyle = {
  backgroundColor: COLORS.BACKGROUND_PRIMARY,
  borderRadius: BORDER_RADIUS.LARGE,
  padding: '24px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

// Button - 10px radius
const buttonStyle = {
  backgroundColor: COLORS.PRIMARY,
  color: COLORS.WHITE,
  borderRadius: BORDER_RADIUS.MEDIUM,
  padding: '12px 24px',
  border: 'none',
};

// Input - 10px radius
const inputStyle = {
  backgroundColor: COLORS.WHITE,
  borderRadius: BORDER_RADIUS.MEDIUM,
  border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  padding: '12px 16px',
};

// Badge - 6px radius
const badgeStyle = {
  backgroundColor: COLORS.PRIMARY_LIGHT,
  color: COLORS.PRIMARY_DARK,
  borderRadius: BORDER_RADIUS.SMALL,
  padding: '4px 8px',
  fontSize: '12px',
};
```

## Spacing Constants (Optional)

```typescript
// src/constants/styles.ts

export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '16px',
  LG: '24px',
  XL: '32px',
  XXL: '48px',
} as const;

export const FONT_SIZE = {
  XS: '12px',
  SM: '14px',
  MD: '16px',
  LG: '18px',
  XL: '24px',
  XXL: '32px',
} as const;
```

## Complete Constants File

```typescript
// src/constants/styles.ts

export const BORDER_RADIUS = {
  LARGE: '30px',
  MEDIUM: '10px',
  SMALL: '6px',
  ROUND: '50%',
  NONE: '0px',
} as const;

export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '16px',
  LG: '24px',
  XL: '32px',
  XXL: '48px',
} as const;

export const FONT_SIZE = {
  XS: '12px',
  SM: '14px',
  MD: '16px',
  LG: '18px',
  XL: '24px',
  XXL: '32px',
} as const;

export const FONT_WEIGHT = {
  NORMAL: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
} as const;

export const SHADOW = {
  SM: '0 1px 2px rgba(0, 0, 0, 0.05)',
  MD: '0 4px 6px rgba(0, 0, 0, 0.1)',
  LG: '0 10px 15px rgba(0, 0, 0, 0.1)',
  XL: '0 20px 25px rgba(0, 0, 0, 0.15)',
} as const;

export const TRANSITION = {
  FAST: '150ms ease',
  NORMAL: '250ms ease',
  SLOW: '350ms ease',
} as const;
```

## Barrel Export

```typescript
// src/constants/index.ts

export * from './colors';
export * from './styles';
```

## Best Practices

### 1. Never Hardcode Colors

```typescript
// ✅ Good
<div style={{ backgroundColor: COLORS.PRIMARY }}>

// ❌ Bad
<div style={{ backgroundColor: '#6B46C1' }}>
```

### 2. Use Semantic Color Names

```typescript
// ✅ Good: Semantic names
COLORS.ERROR          // For error states
COLORS.SUCCESS        // For success states
COLORS.TEXT_PRIMARY   // For main text

// ❌ Bad: Non-semantic names
COLORS.RED            // What is it for?
COLORS.DARK_TEXT      // Not clear if primary/secondary
```

### 3. Group Related Styles

```typescript
// ✅ Good: Grouped style object
const cardStyles = {
  container: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: BORDER_RADIUS.LARGE,
  },
  title: {
    color: COLORS.TEXT_PRIMARY,
  },
};

// Usage
<div style={cardStyles.container}>
  <h1 style={cardStyles.title}>Title</h1>
</div>
```

### 4. Consistent Border Radius

```typescript
// ✅ Good: Use constants
borderRadius: BORDER_RADIUS.LARGE    // 30px for cards
borderRadius: BORDER_RADIUS.MEDIUM   // 10px for buttons

// ❌ Bad: Inconsistent values
borderRadius: '25px'   // Non-standard
borderRadius: '15px'   // Non-standard
```

