# Loading Components

A comprehensive set of reusable loading indicators for the SecYourFlow application, featuring security-themed styling with cyber blue colors.

## Components

### 1. LoadingBar

A sleek progress bar that can be positioned at the top, bottom, or inline within content. Perfect for page-level loading states.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | `boolean` | `true` | Whether the loading bar is visible |
| `progress` | `number` | `undefined` | Progress percentage (0-100). If not provided, shows indeterminate animation |
| `height` | `number` | `3` | Height of the loading bar in pixels |
| `variant` | `"primary" \| "cyber" \| "success" \| "warning" \| "danger"` | `"cyber"` | Color variant |
| `position` | `"top" \| "bottom" \| "inline"` | `"top"` | Position of the loading bar |
| `className` | `string` | `undefined` | Custom className |
| `showGlow` | `boolean` | `true` | Show glow effect |
| `animationSpeed` | `number` | `1500` | Animation speed for indeterminate mode (ms) |

#### Examples

```tsx
// Top loading bar (page-level)
<LoadingBar 
  position="top" 
  variant="cyber" 
  isLoading={isLoading}
/>

// Progress bar with percentage
<LoadingBar 
  position="inline" 
  progress={uploadProgress} 
  variant="primary"
  height={6}
/>

// Bottom loading bar without glow
<LoadingBar 
  position="bottom" 
  variant="success" 
  showGlow={false}
/>
```

### 2. LoadingSpinner

A circular loading spinner for centered loading states or inline use.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Size of the spinner |
| `variant` | `"primary" \| "cyber" \| "success" \| "warning" \| "danger"` | `"cyber"` | Color variant |
| `className` | `string` | `undefined` | Custom className |
| `text` | `string` | `undefined` | Show text below spinner |

#### Examples

```tsx
// Basic spinner
<LoadingSpinner size="lg" variant="cyber" />

// Spinner with text
<LoadingSpinner 
  size="md" 
  variant="cyber" 
  text="Loading data..." 
/>

// Small inline spinner
<LoadingSpinner size="sm" variant="primary" />
```

### 3. LoadingDots

Animated dots for subtle inline loading states.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"primary" \| "cyber" \| "success" \| "warning" \| "danger"` | `"cyber"` | Color variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of dots |
| `className` | `string` | `undefined` | Custom className |

#### Examples

```tsx
// Inline loading dots
<div className="flex items-center gap-2">
  <span>Loading</span>
  <LoadingDots variant="cyber" size="sm" />
</div>

// Standalone dots
<LoadingDots variant="primary" size="md" />
```

### 4. LoadingSkeleton

Placeholder skeletons for content loading states.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `string` | `"100%"` | Width of skeleton |
| `height` | `string` | `"1rem"` | Height of skeleton |
| `rounded` | `"none" \| "sm" \| "md" \| "lg" \| "full"` | `"md"` | Border radius |
| `className` | `string` | `undefined` | Custom className |
| `lines` | `number` | `1` | Number of lines for text skeleton |

#### Examples

```tsx
// Single line skeleton
<LoadingSkeleton width="200px" height="16px" />

// Multiple lines
<LoadingSkeleton lines={3} height="12px" />

// Avatar skeleton
<LoadingSkeleton width="48px" height="48px" rounded="full" />

// Card skeleton
<div className="space-y-3">
  <div className="flex items-center gap-3">
    <LoadingSkeleton width="48px" height="48px" rounded="lg" />
    <div className="flex-1 space-y-2">
      <LoadingSkeleton width="60%" height="16px" />
      <LoadingSkeleton width="40%" height="12px" />
    </div>
  </div>
  <LoadingSkeleton lines={3} height="12px" />
</div>
```

## Color Variants

All components support the following color variants:

- **`primary`** - Blue (#3b82f6)
- **`cyber`** - Cyan/Blue gradient (default, security-themed)
- **`success`** - Green (#22c55e)
- **`warning`** - Yellow (#eab308)
- **`danger`** - Red (#ef4444)

## Usage in Pages

### Example: Assets Page

```tsx
import { LoadingBar } from "@/components/ui/LoadingBar";

export default function AssetsPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <DashboardLayout>
      {/* Top loading bar */}
      <LoadingBar 
        position="top" 
        variant="cyber" 
        isLoading={isLoading}
        showGlow={true}
      />
      
      <div className="space-y-6">
        {/* Page content */}
      </div>
    </DashboardLayout>
  );
}
```

### Example: Upload Progress

```tsx
const [uploadProgress, setUploadProgress] = useState(0);

return (
  <div className="space-y-2">
    <p>Uploading file...</p>
    <LoadingBar 
      position="inline" 
      progress={uploadProgress} 
      variant="primary"
      height={6}
    />
    <span className="text-sm text-muted">{uploadProgress}%</span>
  </div>
);
```

### Example: Data Fetching

```tsx
{isLoading ? (
  <div className="p-20 flex flex-col items-center justify-center">
    <LoadingSpinner size="lg" variant="cyber" text="Fetching data..." />
  </div>
) : (
  <DataTable data={data} />
)}
```

### Example: Skeleton Loading

```tsx
{isLoading ? (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="card p-4">
        <div className="flex items-center gap-3">
          <LoadingSkeleton width="48px" height="48px" rounded="lg" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton width="60%" height="16px" />
            <LoadingSkeleton width="40%" height="12px" />
          </div>
        </div>
      </div>
    ))}
  </div>
) : (
  <ItemList items={items} />
)}
```

## Demo Page

Visit `/demo/loading` to see all loading components in action with interactive controls.

## Animations

The components use the following CSS animations defined in `globals.css`:

- `loading-slide` - Sliding animation for indeterminate progress bars
- `shimmer-fast` - Shimmer effect overlay
- `pulse-glow` - Pulsing glow effect
- `shimmer` - Skeleton shimmer animation

## Best Practices

1. **Use LoadingBar for page-level loading** - Position at top or bottom for global loading states
2. **Use LoadingSpinner for centered content** - Perfect for empty states or full-screen loading
3. **Use LoadingDots for inline states** - Subtle loading indicator next to text
4. **Use LoadingSkeleton for content placeholders** - Maintains layout while loading
5. **Choose the right variant** - Use `cyber` for security-related operations, `danger` for critical operations, etc.
6. **Add glow for emphasis** - Enable `showGlow` for important loading states
7. **Provide progress when possible** - Use determinate progress bars when you can track progress

## Accessibility

- All loading components include appropriate ARIA attributes
- Spinners and progress bars are announced to screen readers
- Color variants maintain sufficient contrast ratios
- Animations respect `prefers-reduced-motion` settings

## Performance

- Components are optimized with React hooks
- Animations use CSS transforms for GPU acceleration
- Lazy mounting prevents unnecessary renders
- Minimal re-renders with proper state management
