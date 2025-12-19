# Component Patterns and Organization

## Component Design Principles

### 1. Single Responsibility Principle

Each component should have one clear purpose:

- ✅ Good: `UserCard` displays user information
- ❌ Bad: `UserCard` displays user info, handles authentication, and manages orders

### 2. Component Categories

Organize components into categories:

#### Atomic Components (ui/)
- Small, reusable UI elements
- No business logic
- Highly configurable via props
- Examples: `Button`, `Input`, `Card`, `Modal`, `Spinner`, `Badge`
- Location: `src/components/ui/`

#### Feature Components (features/)
- Complex components tied to specific features
- May contain business logic
- Examples: `WordCard`, `ExplanationPanel`, `TextSelector`
- Location: `src/components/features/`

#### Page Components (pages/)
- Top-level components representing full pages/views
- Compose other components
- Location: `src/pages/`

## Component File Structure

### Basic Component Template

```typescript
// ComponentName.tsx
import React from 'react';
import { SomeIcon } from 'lucide-react';
import { COLORS } from '@/constants/colors';
import { BORDER_RADIUS } from '@/constants/styles';

interface ComponentNameProps {
  /** Brief description of prop */
  title: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional children */
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  onClick,
  children,
}) => {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState<string>('');
  
  // 2. Event handlers
  const handleClick = () => {
    onClick?.();
  };
  
  // 3. Computed values
  const isActive = state.length > 0;
  
  // 4. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 5. Early returns (loading, error states)
  if (!title) return null;
  
  // 6. Render
  return (
    <div
      style={{
        backgroundColor: COLORS.BACKGROUND_PRIMARY,
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '16px',
      }}
      onClick={handleClick}
    >
      <h3 style={{ color: COLORS.TEXT_PRIMARY }}>{title}</h3>
      {children}
    </div>
  );
};

ComponentName.displayName = 'ComponentName';
```

### Component Folder Structure

```
ComponentName/
├── ComponentName.tsx           # Main component
├── ComponentName.module.css    # Styles (optional, CSS modules)
├── ComponentName.types.ts      # TypeScript types (if complex)
└── index.ts                    # Barrel export
```

## Styling Conventions

### Border Radius

Use consistent border radius values:

| Element Type | Border Radius | Constant |
|--------------|---------------|----------|
| Cards, Modals, Panels, Containers | `30px` | `BORDER_RADIUS.LARGE` |
| Buttons, Inputs | `10px` | `BORDER_RADIUS.MEDIUM` |
| Badges, Tags, Chips | `6px` | `BORDER_RADIUS.SMALL` |
| Circular elements | `50%` | `BORDER_RADIUS.ROUND` |

```typescript
// src/constants/styles.ts
export const BORDER_RADIUS = {
  LARGE: '30px',      // Cards, modals, panels
  MEDIUM: '10px',     // Buttons, inputs
  SMALL: '6px',       // Badges, tags
  ROUND: '50%',       // Circular elements
} as const;
```

### Example Button Component

```typescript
import React from 'react';
import { COLORS } from '@/constants/colors';
import { BORDER_RADIUS } from '@/constants/styles';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return COLORS.PRIMARY;
      case 'secondary': return COLORS.SECONDARY;
      case 'danger': return COLORS.ERROR;
      default: return COLORS.PRIMARY;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return '8px 16px';
      case 'medium': return '12px 24px';
      case 'large': return '16px 32px';
      default: return '12px 24px';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? COLORS.GRAY_400 : getBackgroundColor(),
        color: COLORS.WHITE,
        borderRadius: BORDER_RADIUS.MEDIUM, // 10px for buttons
        padding: getPadding(),
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};
```

### Example Card Component

```typescript
import React from 'react';
import { COLORS } from '@/constants/colors';
import { BORDER_RADIUS } from '@/constants/styles';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  padding = '24px',
}) => {
  return (
    <div
      style={{
        backgroundColor: COLORS.BACKGROUND_PRIMARY,
        borderRadius: BORDER_RADIUS.LARGE, // 30px for cards
        padding,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      {title && (
        <h3 style={{ color: COLORS.TEXT_PRIMARY, marginBottom: '16px' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
```

## Standard Terminology Mapping

When feature descriptions use these terms, implement accordingly:

| Term | Implementation | Border Radius |
|------|----------------|---------------|
| `modal` / `dialog` | Overlay component with backdrop | 30px |
| `card` | Contained content block | 30px |
| `panel` | Section container | 30px |
| `drawer` | Slide-in panel | 30px |
| `button` | Clickable element | 10px |
| `input` / `text field` | Text input element | 10px |
| `dropdown` / `select` | Select or menu component | 10px |
| `badge` | Small label indicator | 6px |
| `chip` / `tag` | Removable label | 6px |
| `toast` / `notification` | Temporary message popup | 10px |
| `tabs` | Tabbed interface navigation | - |
| `accordion` | Collapsible sections | - |
| `list` | Scrollable list of items | - |
| `grid` | Grid layout of items | - |
| `sidebar` | Side navigation panel | 30px |
| `header` | Top navigation bar | - |
| `footer` | Bottom content area | - |
| `loading` / `spinner` | Loading indicator | - |
| `skeleton` | Placeholder loading state | - |
| `tooltip` | Hover information popup | 6px |
| `popover` | Click-triggered popup | 10px |
| `stepper` | Multi-step process UI | - |

## Component Best Practices

### 1. Props Interface

- Always define TypeScript interfaces for props
- Use descriptive prop names
- Document complex props with JSDoc
- Provide default values where appropriate

```typescript
interface ButtonProps {
  /** Button text content */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
}
```

### 2. Event Handlers

- Use descriptive handler names (`handle*`, `on*`)
- Keep handlers focused and small
- Extract complex logic to custom hooks

```typescript
// ✅ Good
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await onSubmit(formData);
};

// ❌ Bad: Inline complex logic
<button onClick={async (e) => {
  e.preventDefault();
  const data = await fetch('/api');
  // ... more logic
}}>
```

### 3. Conditional Rendering

- Use early returns for loading/error states
- Keep JSX clean and readable
- Extract complex conditions to variables

```typescript
// ✅ Good: Early returns
if (!data) return null;
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;

// ✅ Good: Extract complex conditions
const canEdit = user && user.role === 'admin' && !isReadOnly;
```

### 4. Memoization

- Use `React.memo` for expensive components
- Use `useMemo` for expensive computations
- Use `useCallback` for stable function references
- Don't over-optimize prematurely

```typescript
// Memoize expensive components
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  const processed = useMemo(() => expensiveOperation(data), [data]);
  return <div>{processed}</div>;
});

// Stable callback reference
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

