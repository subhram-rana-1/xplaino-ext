# Naming Conventions

## General Principles

1. **Be Descriptive**: Names should clearly indicate purpose
2. **Be Consistent**: Use same patterns throughout the codebase
3. **Follow Conventions**: Stick to established React/TypeScript conventions
4. **Avoid Abbreviations**: Use full words unless abbreviation is widely understood

## File and Folder Naming

### Files

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx`, `WordCard.tsx` |
| Hooks | camelCase with 'use' prefix | `useAuth.ts`, `useWordSelection.ts` |
| Utilities | camelCase | `formatDate.ts`, `textParser.ts` |
| Types | PascalCase | `userTypes.ts`, `apiTypes.ts` |
| Constants | camelCase | `colors.ts`, `styles.ts` |
| DTOs | PascalCase with DTO suffix | `UserSettingsDTO.ts`, `ExplainWordDTO.ts` |
| Atoms | camelCase with Atom suffix | `userAtoms.ts`, `wordsAtoms.ts` |
| Tests | Same as source with `.test` | `UserProfile.test.tsx` |
| Styles | Same as component with `.module.css` | `UserProfile.module.css` |

### Folders

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | kebab-case | `word-selection/`, `text-input/` |
| Component folders | PascalCase | `UserProfile/`, `WordCard/` |
| Shared folders | kebab-case | `shared/`, `utils/`, `hooks/` |
| DTO folders | lowercase | `dto/` |

### Example Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Button/
│   │   │   ├── Button.tsx           # PascalCase
│   │   │   ├── Button.module.css    # Match component
│   │   │   └── index.ts
│   │   └── Card/
│   │       └── Card.tsx
│   └── features/
│       └── word-selector/           # kebab-case folder
│           └── WordSelector.tsx     # PascalCase component
├── hooks/
│   ├── useAuth.ts                   # camelCase with 'use'
│   └── useWordSelection.ts
├── store/
│   ├── userAtoms.ts                 # camelCase with 'Atoms'
│   └── wordsAtoms.ts
├── storage/
│   └── chrome-local/
│       ├── ChromeStorage.ts         # PascalCase
│       └── dto/
│           └── UserSettingsDTO.ts   # PascalCase with DTO
├── api-services/
│   ├── ApiService.ts                # PascalCase
│   └── dto/
│       └── ExplainWordDTO.ts
└── constants/
    ├── colors.ts                    # camelCase
    └── styles.ts
```

## Component Naming

### Component Names

- **PascalCase**: All component names
- **Descriptive**: Clearly indicate component purpose
- **Noun-based**: Components are things

```typescript
// ✅ Good
export const UserProfile: React.FC = () => {};
export const WordCard: React.FC = () => {};
export const ExplanationPanel: React.FC = () => {};
export const TextInputArea: React.FC = () => {};

// ❌ Bad
export const Profile: React.FC = () => {};      // Too generic
export const Comp: React.FC = () => {};          // Abbreviation
export const userProfile: React.FC = () => {};   // Wrong case
export const ShowUser: React.FC = () => {};      // Verb-based
```

### Component File Names

- Match component name exactly
- Use `.tsx` extension for components with JSX

```typescript
// File: UserProfile.tsx
export const UserProfile: React.FC = () => {};

// File: WordCard.tsx
export const WordCard: React.FC = () => {};
```

## Variable Naming

### Variables and Constants

- **camelCase**: Regular variables
- **UPPER_SNAKE_CASE**: Global constants
- **Boolean prefixes**: `is`, `has`, `should`, `can`

```typescript
// ✅ Good
const userName = 'John';
const isLoading = true;
const hasPermission = false;
const shouldRender = true;
const canEdit = false;
const wordList: string[] = [];
const API_BASE_URL = 'https://api.example.com';
const MAX_WORD_COUNT = 100;

// ❌ Bad
const UserName = 'John';      // Wrong case for variable
const loading = true;          // Not descriptive for boolean
const data = [];               // Too generic
const apiBaseUrl = 'https://api.example.com';  // Should be UPPER_SNAKE_CASE
```

### Function Names

- **camelCase**: All function names
- **Verb-based**: Functions do things
- **Handler prefix**: `handle*` for event handlers

```typescript
// ✅ Good
const fetchUserData = async () => {};
const handleSubmit = (e: React.FormEvent) => {};
const handleWordClick = (word: string) => {};
const formatExplanation = (text: string) => {};
const validateInput = (value: string) => {};
const parseTextContent = (html: string) => {};

// ❌ Bad
const UserData = async () => {};     // Not a verb, wrong case
const submit = () => {};              // Not clear it's a handler
const data = () => {};                // Not a verb
```

## Hook Naming

### Custom Hooks

- **camelCase** starting with "use"
- **Descriptive**: Clearly indicate hook purpose

```typescript
// ✅ Good
export const useAuth = () => {};
export const useWordSelection = () => {};
export const useLocalStorage = <T>(key: string) => {};
export const useChromeStorage = () => {};
export const useExplanations = () => {};

// ❌ Bad
export const useGetUser = () => {};   // "get" is redundant
export const auth = () => {};          // Missing "use" prefix
export const useU = () => {};          // Abbreviation
```

### Hook Return Values

Use descriptive names for returned values:

```typescript
// ✅ Good
export const useWordSelection = () => {
  return {
    selectedWords,
    addWord,
    removeWord,
    clearWords,
    wordCount,
    isMaxReached,
  };
};

// ❌ Bad
export const useWordSelection = () => {
  return { a, b, c, d };  // Not descriptive
};
```

## Atom Naming (Jotai)

### Atom Names

- **camelCase** ending with `Atom` suffix
- **Descriptive**: Indicate what the atom stores

```typescript
// ✅ Good
export const userDataAtom = atom<User | null>(null);
export const selectedWordsAtom = atom<string[]>([]);
export const isLoadingAtom = atom<boolean>(false);
export const currentThemeAtom = atom<'light' | 'dark'>('light');
export const explanationsAtom = atom<Explanation[]>([]);

// ❌ Bad
export const userData = atom<User | null>(null);      // Missing 'Atom' suffix
export const words = atom<string[]>([]);               // Missing 'Atom' suffix
export const LOADING_ATOM = atom<boolean>(false);      // Wrong case
export const atomUser = atom<User | null>(null);       // Wrong position of 'Atom'
```

### Derived and Action Atoms

```typescript
// Derived atoms - descriptive name + Atom
export const wordCountAtom = atom((get) => get(selectedWordsAtom).length);
export const hasWordsAtom = atom((get) => get(selectedWordsAtom).length > 0);

// Action atoms - action verb + Atom
export const fetchWordsAtom = atom(null, async (get, set) => {});
export const addWordAtom = atom(null, (get, set, word: string) => {});
export const clearAllAtom = atom(null, (get, set) => {});
```

## DTO Naming

### Storage and API DTOs

- **PascalCase** with `DTO` suffix
- **Descriptive**: Indicate entity or action

```typescript
// ✅ Good - Storage DTOs
export interface UserSettingsDTO { ... }
export interface SavedWordsDTO { ... }
export interface SessionDataDTO { ... }

// ✅ Good - API Request/Response DTOs
export interface ExplainWordRequestDTO { ... }
export interface ExplainWordResponseDTO { ... }
export interface GetWordsResponseDTO { ... }

// ❌ Bad
export interface UserSettings { ... }      // Missing DTO suffix
export interface ExplainWordReq { ... }    // Abbreviation
export interface explainWordDTO { ... }    // Wrong case
```

## Type and Interface Naming

### Types and Interfaces

- **PascalCase**: All type/interface names
- **Descriptive**: Clearly indicate what the type represents
- **Props suffix**: For component props

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

interface WordCardProps {
  word: string;
  onClick: () => void;
}

type UserRole = 'admin' | 'user' | 'guest';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ❌ Bad
interface user { ... }           // Wrong case
interface WordCardProperties { } // Use 'Props' not 'Properties'
interface IUser { ... }          // Don't use 'I' prefix (C# convention)
```

## CSS Naming

### CSS Modules

- **camelCase**: Class names in CSS modules

```css
/* WordCard.module.css */
.container {
  padding: 16px;
}

.wordText {
  font-size: 18px;
}

.actionButton {
  margin-top: 8px;
}

.isHighlighted {
  background-color: yellow;
}
```

### CSS Variables

- **kebab-case**: CSS custom properties

```css
:root {
  --color-primary: #6B46C1;
  --color-text-primary: #1A202C;
  --border-radius-large: 30px;
}
```

## Quick Reference Table

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `UserProfile` |
| Component File | PascalCase.tsx | `UserProfile.tsx` |
| Hook | camelCase (use*) | `useAuth` |
| Hook File | camelCase.ts | `useAuth.ts` |
| Function | camelCase (verb) | `fetchUserData` |
| Event Handler | handle* | `handleClick` |
| Variable | camelCase | `userName` |
| Boolean Variable | is/has/should/can | `isLoading` |
| Constant | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Atom | camelCase + Atom | `userDataAtom` |
| DTO | PascalCase + DTO | `UserSettingsDTO` |
| Type/Interface | PascalCase | `User`, `WordCardProps` |
| Feature Folder | kebab-case | `word-selection/` |
| Component Folder | PascalCase | `UserProfile/` |
| CSS Module Class | camelCase | `container`, `wordText` |
| CSS Variable | kebab-case | `--color-primary` |
| Test File | *.test.tsx | `UserProfile.test.tsx` |

