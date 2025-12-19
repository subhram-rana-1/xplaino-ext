# Chrome Extension Development Rules

This project is a Chrome Extension built with modern web technologies. All cursor agents must adhere to these rules when implementing features or making changes.

## Tech Stack

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **ESLint** - Code linting
- **Jotai** - State management
- **Lucide React** - Icons

## Rule Organization

These rules are organized into separate files for better maintainability:

- `.cursorrules/01-project-structure.md` - File and folder organization
- `.cursorrules/02-component-patterns.md` - Component design and organization
- `.cursorrules/03-state-management.md` - Jotai state management patterns
- `.cursorrules/04-chrome-storage.md` - Chrome storage class patterns
- `.cursorrules/05-api-services.md` - API service patterns and DTOs
- `.cursorrules/06-styling-colors.md` - Colors and styling conventions
- `.cursorrules/07-naming-conventions.md` - File and code naming conventions
- `.cursorrules/08-assets-icons.md` - Assets, icons, logos organization

## Core Principles

1. **Modular Architecture**: Organize code into reusable, self-contained modules
2. **Type Safety**: Use TypeScript for all code with proper type definitions
3. **Centralized State**: Use Jotai for global state management
4. **Centralized Storage**: Use ChromeStorage class for all chrome.storage.local operations
5. **Centralized API**: Use ApiService class for all API calls
6. **Color Constants**: Never hardcode colors - always use constants
7. **Reusable Components**: Build atomic, reusable UI components
8. **Consistent Styling**: Follow border radius and spacing conventions

## Before Implementing Any Feature

1. Review the relevant rule files in `.cursorrules/` directory
2. Follow the project structure defined in `01-project-structure.md`
3. Ensure component patterns match `02-component-patterns.md`
4. Use Jotai for state management from `03-state-management.md`
5. Use ChromeStorage class for storage from `04-chrome-storage.md`
6. Use ApiService for API calls from `05-api-services.md`
7. Follow color/styling conventions from `06-styling-colors.md`
8. Apply naming conventions from `07-naming-conventions.md`
9. Organize assets following `08-assets-icons.md`

## Quick Reference

### Folder Structure
```
src/
├── components/          # Reusable UI components (ui/, features/)
├── pages/               # Page-level components
├── hooks/               # Custom React hooks
├── store/               # Jotai atoms
├── storage/chrome-local/# Chrome storage (ChromeStorage.ts, dto/)
├── api-services/        # API handling (ApiService.ts, dto/)
├── constants/           # Color and other constants
├── assets/              # icons/, logos/, svg/, photos/
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | `useAuth.ts` |
| Atoms | camelCase with 'Atom' suffix | `userDataAtom` |
| DTOs | PascalCase with 'DTO' suffix | `UserSettingsDTO.ts` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

### Styling Quick Reference
| Element | Border Radius |
|---------|---------------|
| Cards, Modals, Panels | `30px` |
| Buttons, Inputs | `10px` |
| Badges, Tags | `6px` |

### Icons
- Use `lucide-react` library for all icons
- Custom icons go in `src/assets/icons/`

### Colors
- All colors in `src/constants/colors.ts`
- Never hardcode hex/rgb values

