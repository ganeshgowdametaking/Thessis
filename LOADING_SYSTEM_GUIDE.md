# Loading System Guide

This guide explains how to use the new loading system implemented in the TankTide application.

## Overview

The loading system consists of:
1. **LoadingSpinner Component** - A reusable loading UI component
2. **LoadingContext** - Global loading state management
3. **CSS Animations** - Custom loading animations

## Components

### LoadingSpinner Component

Located at `src/components/LoadingSpinner.tsx`

**Props:**
- `text` (optional): Custom loading text (default: "Loading...")
- `size` (optional): Size of the spinner - 'small', 'medium', 'large' (default: 'medium')

**Usage:**
```tsx
import LoadingSpinner from './LoadingSpinner';

// Basic usage
<LoadingSpinner />

// With custom text
<LoadingSpinner text="Loading jobs..." />

// With custom size
<LoadingSpinner text="Processing..." size="large" />
```

### LoadingContext

Located at `src/contexts/LoadingContext.tsx`

**Hook:**
```tsx
import { useLoading } from '../contexts/LoadingContext';

const { isLoading, loadingText, showLoading, hideLoading } = useLoading();
```

**Methods:**
- `showLoading(text?)` - Show global loading with optional custom text
- `hideLoading()` - Hide global loading
- `isLoading` - Boolean indicating if loading is active
- `loadingText` - Current loading text

## Usage Examples

### 1. Component-Level Loading

For loading states within a specific component:

```tsx
import LoadingSpinner from './LoadingSpinner';

const MyComponent = () => {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner text="Loading data..." />;
  }

  return <div>Your content</div>;
};
```

### 2. Global Loading

For operations that should show loading across the entire app:

```tsx
import { useLoading } from '../contexts/LoadingContext';

const MyComponent = () => {
  const { showLoading, hideLoading } = useLoading();

  const handleSubmit = async () => {
    showLoading('Submitting form...');
    try {
      await submitData();
    } finally {
      hideLoading();
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
};
```

### 3. API Calls with Loading

```tsx
const fetchData = async () => {
  showLoading('Fetching data...');
  try {
    const data = await api.getData();
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    hideLoading();
  }
};
```

## Features

### Responsive Design
- Automatically adjusts size and positioning for mobile and desktop
- Mobile-optimized text size and spacing

### Customizable
- Custom loading text
- Multiple size options
- Global or component-level usage

### Non-Intrusive
- Global loading appears as an overlay
- Component-level loading replaces content
- No interference with existing functionality

## CSS Classes

The loading system uses these CSS classes:
- `.loader` - Individual loader elements
- `.dot` - Loading dots
- `.text` - Loading text
- `@keyframes rotate0234` - Animation keyframes

## Integration

The LoadingProvider is already integrated into the main App component, so the `useLoading` hook is available throughout the application.

## Best Practices

1. **Use component-level loading** for page-specific loading states
2. **Use global loading** for operations that affect the entire app
3. **Always provide descriptive loading text** for better UX
4. **Handle errors properly** and hide loading in finally blocks
5. **Use appropriate sizes** - 'small' for inline, 'medium' for pages, 'large' for important operations 