# Project Structure and Organization

## Directory Structure

Follow this structure for the Chrome extension:

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Input, Card, Modal, etc.)
│   │   └── [ComponentName]/
│   │       ├── ComponentName.tsx
│   │       ├── ComponentName.module.css (optional)
│   │       └── index.ts
│   └── features/        # Feature-specific components
│       └── [FeatureName]/
│           └── [ComponentName]/
├── pages/               # Page-level components
│   └── [PageName]/
│       ├── PageName.tsx
│       └── index.ts
├── hooks/               # Custom React hooks
│   └── use[HookName].ts
├── store/               # Jotai atoms and state management
│   ├── [feature]Atoms.ts
│   └── index.ts
├── storage/
│   └── chrome-local/    # Chrome storage implementation
│       ├── ChromeStorage.ts      # Central storage class
│       └── dto/                  # Storage DTOs (statically defined)
│           ├── [EntityName]DTO.ts
│           └── index.ts
├── api-services/        # API handling
│   ├── ApiService.ts    # Central API class
│   └── dto/             # Request/Response DTOs (statically defined)
│       ├── [EntityName]DTO.ts
│       └── index.ts
├── constants/
│   ├── colors.ts        # Color constants (REQUIRED)
│   ├── styles.ts        # Style constants (border radius, etc.)
│   └── index.ts
├── assets/
│   ├── icons/           # Custom icon components/files
│   ├── logos/           # Logo files
│   ├── svg/             # SVG illustrations and decorative graphics
│   └── photos/          # Image files (jpg, png, webp)
├── types/               # TypeScript type definitions
│   ├── common.ts
│   └── index.ts
├── utils/               # Utility functions
│   └── [utilityName].ts
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── vite.config.ts       # Vite configuration
```

## Key Principles

### 1. Component Organization

- **ui/**: Base UI components that are reusable across the entire app
  - Button, Input, Card, Modal, Spinner, Badge, etc.
  - No business logic, highly configurable via props
  
- **features/**: Feature-specific components
  - Components tied to specific features
  - May contain business logic
  - Example: `WordCard`, `ExplanationPanel`, `SelectionHighlight`

### 2. Centralized Services

All external interactions should go through centralized classes:

```
storage/chrome-local/ChromeStorage.ts  → All chrome.storage.local operations
api-services/ApiService.ts             → All API calls
```

### 3. State Management Location

All Jotai atoms MUST be in `src/store/`:

```
store/
├── userAtoms.ts         # User-related atoms
├── settingsAtoms.ts     # Settings atoms
├── wordsAtoms.ts        # Words feature atoms
└── index.ts             # Barrel exports
```

### 4. DTO Organization

DTOs (Data Transfer Objects) are statically defined in their respective folders:

```
storage/chrome-local/dto/    # DTOs for stored objects
api-services/dto/            # DTOs for API requests/responses
```

## Import Organization

Order imports as follows:

```typescript
// 1. React and React-related
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { useAtom } from 'jotai';
import { Search } from 'lucide-react';

// 3. Internal absolute imports (@/)
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { ApiService } from '@/api-services/ApiService';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { userAtom } from '@/store/userAtoms';

// 4. Relative imports
import { ChildComponent } from './ChildComponent';
import { formatText } from './utils';

// 5. Type imports
import type { User } from '@/types';

// 6. Style imports
import styles from './Component.module.css';
```

## Path Aliases

Configure path aliases in `tsconfig.json` and `vite.config.ts`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Usage:
```typescript
import { COLORS } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { ApiService } from '@/api-services/ApiService';
```

## Barrel Exports (index.ts)

Use `index.ts` files to create clean public APIs:

```typescript
// src/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export { Modal } from './Modal';

// src/store/index.ts
export * from './userAtoms';
export * from './settingsAtoms';

// src/storage/chrome-local/dto/index.ts
export * from './UserSettingsDTO';
export * from './SavedWordsDTO';
```

## File Organization Rules

1. **One component per file** (except for small related components)
2. **Co-locate related files** (component, styles, types in same folder)
3. **Use index.ts for exports** from folders
4. **Keep DTOs statically defined** in their respective dto/ folders
5. **All atoms in store/** folder with `*Atom` suffix
6. **All colors in constants/colors.ts** - never hardcode colors

