# State Management with Jotai

## Overview

This project uses **Jotai** for global state management. Jotai provides a simple, atomic approach to React state that is both performant and easy to use.

## Atom Location and Organization

### Location Rules

- **All atoms MUST be defined in `src/store/` folder**
- Group related atoms in separate files
- Use barrel exports via `index.ts`

### Folder Structure

```
src/store/
├── userAtoms.ts         # User-related atoms
├── settingsAtoms.ts     # Settings/preferences atoms
├── wordsAtoms.ts        # Words feature atoms
├── uiAtoms.ts           # UI state atoms (modals, loading, etc.)
└── index.ts             # Barrel exports
```

### Barrel Export

```typescript
// src/store/index.ts
export * from './userAtoms';
export * from './settingsAtoms';
export * from './wordsAtoms';
export * from './uiAtoms';
```

## Naming Conventions

### Atom Naming Rules

- **All atom names MUST end with `Atom` suffix**
- Use camelCase
- Be descriptive about what the atom contains

```typescript
// ✅ Good
export const userDataAtom = atom<User | null>(null);
export const selectedWordsAtom = atom<string[]>([]);
export const isLoadingAtom = atom<boolean>(false);
export const currentThemeAtom = atom<'light' | 'dark'>('light');

// ❌ Bad
export const userData = atom<User | null>(null);     // Missing 'Atom' suffix
export const words = atom<string[]>([]);             // Missing 'Atom' suffix
export const LOADING_ATOM = atom<boolean>(false);    // Wrong case
```

## Atom Patterns

### 1. Basic Atom

Simple state holder:

```typescript
// src/store/userAtoms.ts
import { atom } from 'jotai';
import type { User } from '@/types';

// Primitive atom
export const isLoggedInAtom = atom<boolean>(false);

// Object atom
export const userDataAtom = atom<User | null>(null);

// Array atom
export const selectedWordsAtom = atom<string[]>([]);
```

### 2. Derived Atom (Read-Only)

Computed values based on other atoms:

```typescript
// src/store/wordsAtoms.ts
import { atom } from 'jotai';

export const selectedWordsAtom = atom<string[]>([]);

// Derived atom - computes word count
export const wordCountAtom = atom((get) => {
  return get(selectedWordsAtom).length;
});

// Derived atom - filters words
export const longWordsAtom = atom((get) => {
  const words = get(selectedWordsAtom);
  return words.filter(word => word.length > 5);
});

// Derived atom - combines multiple atoms
export const userSummaryAtom = atom((get) => {
  const user = get(userDataAtom);
  const wordCount = get(wordCountAtom);
  return {
    name: user?.name ?? 'Guest',
    totalWords: wordCount,
  };
});
```

### 3. Writable Derived Atom

Derived atom with custom setter:

```typescript
// src/store/wordsAtoms.ts
import { atom } from 'jotai';

export const selectedWordsAtom = atom<string[]>([]);

// Writable derived atom
export const filteredWordsAtom = atom(
  // Getter
  (get) => get(selectedWordsAtom).filter(word => word.length > 3),
  // Setter
  (get, set, newWords: string[]) => {
    set(selectedWordsAtom, newWords);
  }
);

// Atom with transformation on set
export const uppercaseWordsAtom = atom(
  (get) => get(selectedWordsAtom).map(w => w.toUpperCase()),
  (get, set, newWord: string) => {
    const current = get(selectedWordsAtom);
    set(selectedWordsAtom, [...current, newWord.toLowerCase()]);
  }
);
```

### 4. Async Atom

Atom with async getter or action:

```typescript
// src/store/wordsAtoms.ts
import { atom } from 'jotai';
import { ApiService } from '@/api-services/ApiService';

// Async read atom
export const explanationsAtom = atom(async (get) => {
  const words = get(selectedWordsAtom);
  if (words.length === 0) return [];
  
  const explanations = await ApiService.explainWords(words);
  return explanations;
});

// Write-only async action atom
export const fetchWordsAtom = atom(
  null, // No read value
  async (get, set) => {
    set(isLoadingAtom, true);
    try {
      const response = await ApiService.getWords();
      set(selectedWordsAtom, response.words);
    } catch (error) {
      set(errorAtom, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      set(isLoadingAtom, false);
    }
  }
);

// Async action with parameters
export const addWordAtom = atom(
  null,
  async (get, set, word: string) => {
    const current = get(selectedWordsAtom);
    if (!current.includes(word)) {
      set(selectedWordsAtom, [...current, word]);
    }
  }
);
```

### 5. Atom with Storage (Persistence)

For persisting atoms to Chrome storage:

```typescript
// src/store/settingsAtoms.ts
import { atom } from 'jotai';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import type { UserSettingsDTO } from '@/storage/chrome-local/dto';

// Settings atom with Chrome storage sync
export const settingsAtom = atom<UserSettingsDTO | null>(null);

// Load settings from storage
export const loadSettingsAtom = atom(
  null,
  async (get, set) => {
    const settings = await ChromeStorage.getUserSettings();
    set(settingsAtom, settings);
  }
);

// Save settings to storage
export const saveSettingsAtom = atom(
  null,
  async (get, set, newSettings: UserSettingsDTO) => {
    await ChromeStorage.setUserSettings(newSettings);
    set(settingsAtom, newSettings);
  }
);
```

## Usage in Components

### Using useAtom (Read and Write)

```typescript
import { useAtom } from 'jotai';
import { selectedWordsAtom } from '@/store/wordsAtoms';

const WordSelector: React.FC = () => {
  const [words, setWords] = useAtom(selectedWordsAtom);

  const addWord = (word: string) => {
    setWords([...words, word]);
  };

  const removeWord = (word: string) => {
    setWords(words.filter(w => w !== word));
  };

  return (
    <div>
      {words.map(word => (
        <span key={word} onClick={() => removeWord(word)}>
          {word}
        </span>
      ))}
    </div>
  );
};
```

### Using useAtomValue (Read Only)

```typescript
import { useAtomValue } from 'jotai';
import { wordCountAtom, isLoadingAtom } from '@/store/wordsAtoms';

const WordCount: React.FC = () => {
  const count = useAtomValue(wordCountAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  if (isLoading) return <Spinner />;

  return <span>Selected: {count} words</span>;
};
```

### Using useSetAtom (Write Only)

```typescript
import { useSetAtom } from 'jotai';
import { fetchWordsAtom, addWordAtom } from '@/store/wordsAtoms';

const WordActions: React.FC = () => {
  const fetchWords = useSetAtom(fetchWordsAtom);
  const addWord = useSetAtom(addWordAtom);

  return (
    <div>
      <button onClick={() => fetchWords()}>Fetch Words</button>
      <button onClick={() => addWord('hello')}>Add "hello"</button>
    </div>
  );
};
```

## Best Practices

### 1. Atom Granularity

Keep atoms focused and granular:

```typescript
// ✅ Good: Separate atoms for separate concerns
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);
export const dataAtom = atom<Data | null>(null);

// ❌ Bad: One big atom for everything
export const stateAtom = atom({
  isLoading: false,
  error: null,
  data: null,
});
```

### 2. Derived Atoms for Computed Values

Use derived atoms instead of computing in components:

```typescript
// ✅ Good: Derived atom
export const wordCountAtom = atom((get) => get(selectedWordsAtom).length);

// Component
const count = useAtomValue(wordCountAtom);

// ❌ Bad: Computing in component
const words = useAtomValue(selectedWordsAtom);
const count = words.length;
```

### 3. Action Atoms for Side Effects

Use write-only atoms for actions with side effects:

```typescript
// ✅ Good: Action atom
export const saveAndSyncAtom = atom(
  null,
  async (get, set, data: Data) => {
    await ChromeStorage.saveData(data);
    await ApiService.sync(data);
    set(dataAtom, data);
  }
);
```

### 4. Type Safety

Always provide proper TypeScript types:

```typescript
// ✅ Good: Explicit types
export const userAtom = atom<User | null>(null);
export const statusAtom = atom<'idle' | 'loading' | 'success' | 'error'>('idle');

// ❌ Bad: Inferred as never[]
export const wordsAtom = atom([]);
```

## Complete Example

```typescript
// src/store/wordsAtoms.ts
import { atom } from 'jotai';
import { ApiService } from '@/api-services/ApiService';
import type { WordExplanation } from '@/types';

// State atoms
export const selectedWordsAtom = atom<string[]>([]);
export const explanationsAtom = atom<WordExplanation[]>([]);
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

// Derived atoms
export const wordCountAtom = atom((get) => get(selectedWordsAtom).length);
export const hasWordsAtom = atom((get) => get(selectedWordsAtom).length > 0);

// Action atoms
export const addWordAtom = atom(
  null,
  (get, set, word: string) => {
    const current = get(selectedWordsAtom);
    if (!current.includes(word)) {
      set(selectedWordsAtom, [...current, word]);
    }
  }
);

export const removeWordAtom = atom(
  null,
  (get, set, word: string) => {
    const current = get(selectedWordsAtom);
    set(selectedWordsAtom, current.filter(w => w !== word));
  }
);

export const clearWordsAtom = atom(
  null,
  (get, set) => {
    set(selectedWordsAtom, []);
    set(explanationsAtom, []);
  }
);

export const explainWordsAtom = atom(
  null,
  async (get, set) => {
    const words = get(selectedWordsAtom);
    if (words.length === 0) return;

    set(isLoadingAtom, true);
    set(errorAtom, null);

    try {
      const explanations = await ApiService.explainWords({ words });
      set(explanationsAtom, explanations.explanations);
    } catch (error) {
      set(errorAtom, error instanceof Error ? error.message : 'Failed to explain words');
    } finally {
      set(isLoadingAtom, false);
    }
  }
);
```

