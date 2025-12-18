# Assets and Icons Organization

## Overview

All static assets must be organized in the `src/assets/` folder with dedicated subfolders for different asset types.

## Folder Structure

```
src/assets/
├── icons/           # Custom icon components/files
├── logos/           # Logo files (app logo, brand assets)
├── svg/             # SVG illustrations and decorative graphics
└── photos/          # Image files (jpg, png, webp)
```

## Icons

### Primary Icon Library: Lucide React

Use `lucide-react` as the primary icon library. It provides:
- Consistent icon style
- Tree-shaking support
- TypeScript support
- Customizable size and color

### Lucide Icons Usage

```typescript
import { Search, Plus, X, ChevronDown, Settings, Check, AlertCircle } from 'lucide-react';
import { COLORS } from '@/constants/colors';

// Basic usage
<Search size={20} />

// With color from constants
<Search size={20} color={COLORS.TEXT_PRIMARY} />

// With custom props
<Plus size={24} strokeWidth={2} color={COLORS.PRIMARY} />

// In a button
<button>
  <Settings size={18} />
  Settings
</button>
```

### Common Lucide Icons

| Purpose | Icon | Import |
|---------|------|--------|
| Search | 🔍 | `Search` |
| Add | ➕ | `Plus` |
| Close | ✕ | `X` |
| Settings | ⚙️ | `Settings` |
| Check | ✓ | `Check` |
| Error | ⚠️ | `AlertCircle` |
| Info | ℹ️ | `Info` |
| Arrow | → | `ArrowRight`, `ChevronRight` |
| Menu | ☰ | `Menu` |
| User | 👤 | `User` |
| Edit | ✏️ | `Edit`, `Pencil` |
| Delete | 🗑️ | `Trash2` |
| Copy | 📋 | `Copy` |
| Download | ⬇️ | `Download` |
| Upload | ⬆️ | `Upload` |

### Custom Icons

For icons not available in Lucide, create custom React components:

```typescript
// src/assets/icons/CustomIcon.tsx
import React from 'react';
import { COLORS } from '@/constants/colors';

interface CustomIconProps {
  size?: number;
  color?: string;
}

export const CustomIcon: React.FC<CustomIconProps> = ({
  size = 24,
  color = COLORS.TEXT_PRIMARY,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* SVG path here */}
    </svg>
  );
};
```

### Icons Barrel Export

```typescript
// src/assets/icons/index.ts
export { CustomIcon } from './CustomIcon';
export { AnotherIcon } from './AnotherIcon';
```

## Logos

### Location

All logo files go in `src/assets/logos/`

### Naming Convention

```
logos/
├── logo.svg              # Main logo
├── logo-dark.svg         # Dark mode variant
├── logo-light.svg        # Light mode variant
├── logo-icon.svg         # Icon-only version
├── logo-text.svg         # Text-only version
└── favicon.ico           # Favicon
```

### Logo Component

```typescript
// src/assets/logos/Logo.tsx
import React from 'react';
import logoSrc from './logo.svg';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  small: { width: 80, height: 24 },
  medium: { width: 120, height: 36 },
  large: { width: 160, height: 48 },
};

export const Logo: React.FC<LogoProps> = ({ size = 'medium', className }) => {
  const dimensions = sizeMap[size];
  
  return (
    <img
      src={logoSrc}
      alt="Logo"
      width={dimensions.width}
      height={dimensions.height}
      className={className}
    />
  );
};
```

## SVG Illustrations

### Location

Decorative SVGs and illustrations go in `src/assets/svg/`

### Types of SVGs

- Illustrations
- Decorative backgrounds
- Complex graphics
- Empty states

### Naming Convention

```
svg/
├── empty-state.svg       # Empty state illustration
├── hero-background.svg   # Background graphic
├── success-illustration.svg
└── error-illustration.svg
```

### Usage

```typescript
import emptySvg from '@/assets/svg/empty-state.svg';

const EmptyState: React.FC = () => (
  <div>
    <img src={emptySvg} alt="No items" />
    <p>No items found</p>
  </div>
);
```

## Photos

### Location

Image files (jpg, png, webp) go in `src/assets/photos/`

### Types

- Background images
- User-facing photography
- Product images
- Placeholder images

### Naming Convention

```
photos/
├── hero-bg.jpg           # Background images
├── placeholder-user.png  # Placeholder images
├── feature-preview.webp  # Feature images
└── onboarding-1.png      # Onboarding images
```

### Usage

```typescript
import heroBg from '@/assets/photos/hero-bg.jpg';

const Hero: React.FC = () => (
  <div style={{ backgroundImage: `url(${heroBg})` }}>
    <h1>Welcome</h1>
  </div>
);
```

## Best Practices

### 1. Prefer Lucide Icons

```typescript
// ✅ Good: Use Lucide
import { Search } from 'lucide-react';
<Search size={20} />

// ❌ Bad: Custom icon when Lucide has it
import { CustomSearchIcon } from '@/assets/icons';
```

### 2. Consistent Icon Sizing

```typescript
// Standard sizes
const ICON_SIZES = {
  SM: 16,
  MD: 20,
  LG: 24,
  XL: 32,
};

<Search size={ICON_SIZES.MD} />
```

### 3. Use Colors from Constants

```typescript
// ✅ Good
<Search color={COLORS.TEXT_PRIMARY} />

// ❌ Bad
<Search color="#1A202C" />
```

### 4. Organize by Purpose

```
assets/
├── icons/     # Interactive icons (buttons, nav)
├── logos/     # Brand identity
├── svg/       # Decorative/illustrative
└── photos/    # Photography/images
```

