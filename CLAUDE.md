# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 product customization application for designing custom print-on-demand products (e.g., t-shirts). Users can add text and images to multiple product sides, switch between different views, and save their designs to localStorage.

## Development Commands

```bash
# Development server
npm run dev

# Production build
npm build

# Start production server
npm start

# Lint
npm run lint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19.2.1
- **Canvas Library**: Fabric.js 6.9.1 for canvas manipulation
- **State Management**: Zustand 5.0.9
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (authentication and storage)
- **Icons**: Lucide React, React Icons

## Architecture

### Canvas System

The canvas system is built around Fabric.js and managed through a centralized Zustand store:

- **[store/useCanvasStore.ts](store/useCanvasStore.ts)**: Global state management for all canvases
  - Manages multiple canvas instances (one per product side)
  - Handles edit mode, active side selection, and product color
  - Provides serialization/deserialization for saving/loading designs
  - Filters out background images and guide elements during save/restore operations

- **[app/components/canvas/SingleSideCanvas.tsx](app/components/canvas/SingleSideCanvas.tsx)**: Individual canvas instance
  - Creates and initializes Fabric.js canvas for each product side
  - Registers canvas with global store on mount
  - Sets up print area clipping masks and snap lines
  - Handles product image loading with color filters
  - Manages object interactivity based on edit mode

- **[app/components/canvas/ProductDesigner.tsx](app/components/canvas/ProductDesigner.tsx)**: Main canvas container
  - Displays all product sides in a swipeable carousel
  - Handles touch/mouse gestures for side navigation
  - Manages edit mode transitions
  - Shows pagination dots for multiple sides

- **[app/components/canvas/Toolbar.tsx](app/components/canvas/Toolbar.tsx)**: Edit mode toolbar
  - Provides tools for adding text, images, and shapes
  - Handles object selection and deletion
  - Manages layer ordering
  - Contains reset functionality

### State Management Pattern

The app uses Zustand for centralized canvas management:

```typescript
// Canvas instances are registered by side ID
registerCanvas: (id: string, canvas: fabric.Canvas) => void

// Active canvas is retrieved by current side ID
getActiveCanvas: () => fabric.Canvas | null

// Canvas state is serialized excluding system objects
saveAllCanvasState: () => Record<string, string>
restoreAllCanvasState: (savedState: Record<string, string>) => Promise<void>
```

**Important**: User-added objects must be distinguished from system objects (background image, guides, snap lines). System objects use `excludeFromExport: true` or `data.id: 'background-product-image'` to prevent serialization.

### Routes

- **[app/page.tsx](app/page.tsx)**: Landing page
- **[app/home/page.tsx](app/home/page.tsx)**: Product catalog
- **[app/product/[product_id]/page.tsx](app/product/[product_id]/page.tsx)**: Product detail page
- **[app/editor/[productId]/page.tsx](app/editor/[productId]/page.tsx)**: Main product customization interface
  - Contains mock product data and color options
  - Includes test controls for save/load/clear state (localStorage)
  - Manages edit mode toggle and product color selection

### Type Definitions

Located in [types/types.ts](types/types.ts):

```typescript
ProductSide: {
  id: string;           // Unique identifier (e.g., 'front', 'back')
  name: string;         // Display name
  imageUrl: string;     // Product mockup image URL
  printArea: {          // Printable region coordinates
    x: number;
    y: number;
    width: number;
    height: number;
  }
}

ProductConfig: {
  productId: string;
  sides: ProductSide[];
}
```

## Path Aliases

The project uses `@/*` for absolute imports from the root directory:

```typescript
import { useCanvasStore } from '@/store/useCanvasStore';
import { ProductConfig } from '@/types/types';
```

## Fabric.js Canvas Patterns

### Object Lifecycle

1. Canvas objects are created with `excludeFromExport: true` for non-user elements
2. User objects (text, images) are selectable only in edit mode
3. Background product images use `data.id: 'background-product-image'` to identify them
4. Objects are filtered during serialization to exclude system elements

### Edit Mode vs View Mode

- **View Mode** (`isEditMode: false`):
  - Canvas objects are non-interactive (`selectable: false`, `evented: false`)
  - Swipe gestures enabled for side navigation
  - Toolbar hidden

- **Edit Mode** (`isEditMode: true`):
  - Canvas objects are interactive
  - Swipe gestures disabled
  - Toolbar visible with text/image/shape tools
  - Delete button appears in header for selected objects

### Color Filtering

Product images use Fabric.js color filters to apply product color changes. When `productColor` changes in the store, the background product image is updated with a multiply blend filter.

## Key Features

1. **Multi-Side Design**: Products have multiple customizable sides (front, back, sleeves)
2. **Canvas Clipping**: Print areas are clipped to designated regions
3. **Snap Lines**: Center guides help with object alignment
4. **State Persistence**: Designs can be saved to localStorage
5. **Dynamic Product Colors**: Product background color can be changed
6. **Touch/Mouse Gestures**: Swipe between product sides

## Supabase Integration

- **Storage**: Product mockup images hosted on Supabase Storage
- **Authentication**: Uses `@supabase/ssr` and `@supabase/supabase-js`
- **Environment**: Credentials in `.env.local`
- **MCP Server**: Configured in `.mcp.json` with project ref: `xwuvbztgpwhbwohontuh`

## Component Structure

```
app/
├── components/
│   ├── canvas/
│   │   ├── ProductDesigner.tsx    # Main canvas container with side carousel
│   │   ├── SingleSideCanvas.tsx   # Individual Fabric.js canvas instance
│   │   ├── Toolbar.tsx            # Edit mode tools
│   │   ├── TextStylePanel.tsx     # Text styling controls
│   │   └── EditButton.tsx         # Toggle edit mode button
│   ├── Header.tsx                 # App header with back button and delete
│   ├── BottomNavBar.tsx          # Navigation bar
│   ├── ProductCard.tsx           # Product listing card
│   ├── CartButton.tsx            # Shopping cart button
│   └── HeroBanner.tsx            # Hero banner component
├── editor/[productId]/           # Main editor page
├── product/[product_id]/         # Product detail page
├── home/                         # Product catalog
└── page.tsx                      # Landing page
```

## Important Notes

- All canvas components use `'use client'` directive (client-side only)
- SingleSideCanvas is dynamically imported with `ssr: false` to prevent SSR issues with Fabric.js
- Canvas state serialization filters out background images, guides, and snap lines
- Edit mode must be properly exited to deselect all objects before mode transition
- Product colors are applied via Fabric.js filters, not direct image replacement