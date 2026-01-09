# Font Upload Implementation Guide

## Overview

Custom font upload functionality has been successfully implemented for your Fabric.js-based product designer. Users can now upload their own font files (`.ttf`, `.otf`, `.woff`, `.woff2`) and use them in their text designs.

## Key Features

1. **Font Upload UI**: Upload button integrated directly into the TextStylePanel font dropdown
2. **Font Storage**: Fonts stored in Supabase Storage (`user-fonts` bucket)
3. **Font Metadata**: Font information saved with each design
4. **Dynamic Font Loading**: Fonts loaded automatically when designs are opened
5. **Smart Cleanup**: Fonts deleted only when not referenced by any orders

## Architecture

### 1. Storage Configuration

**File**: [lib/storage-config.ts](lib/storage-config.ts)

Added new storage bucket configuration:
```typescript
export const STORAGE_BUCKETS = {
  USER_DESIGNS: 'user-designs',
  TEXT_EXPORTS: 'text-exports',
  FONTS: 'user-fonts', // New bucket for custom fonts
} as const;
```

### 2. Font Utilities

**File**: [lib/fontUtils.ts](lib/fontUtils.ts)

Core functions for font management:
- `uploadFont()`: Upload font file to Supabase Storage
- `loadCustomFont()`: Load font into browser using FontFace API
- `loadCustomFonts()`: Load multiple fonts
- `deleteFont()`: Delete single font file
- `deleteFonts()`: Batch delete font files
- `isValidFontFile()`: Validate font file extensions

**Font Metadata Structure**:
```typescript
interface FontMetadata {
  fontFamily: string;  // Display name
  fileName: string;    // Original file name
  url: string;         // Supabase public URL
  path: string;        // Storage path for deletion
  uploadedAt: string;  // ISO timestamp
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
}
```

### 3. Font Store

**File**: [store/useFontStore.ts](store/useFontStore.ts)

Zustand store for managing custom fonts in the current session:
- `customFonts`: Array of loaded font metadata
- `addFont()`: Add a new font
- `removeFont()`: Remove a font
- `loadAllFonts()`: Load all fonts into browser
- `setCustomFonts()`: Set fonts from saved design
- `clearFonts()`: Clear all fonts

### 4. Database Schema

#### saved_designs table

**Migration**: `add_custom_fonts_to_saved_designs`

New column:
```sql
custom_fonts jsonb DEFAULT '[]'::jsonb
```

Stores array of FontMetadata objects for each design.

#### order_items table

**Migration**: `add_custom_fonts_to_order_items`

New column:
```sql
custom_fonts jsonb DEFAULT '[]'::jsonb
```

Snapshot of fonts at order time to prevent deletion of fonts used in orders.

### 5. Supabase Storage

**Bucket**: `user-fonts`

Configuration:
- Public read access
- 10MB file size limit
- Allowed MIME types: font/ttf, font/otf, font/woff, font/woff2, etc.

**RLS Policies**:
- Public read access for all fonts
- Authenticated users can upload fonts
- Users can delete fonts (with path-based restrictions)

### 6. UI Integration

**File**: [app/components/canvas/TextStylePanel.tsx](app/components/canvas/TextStylePanel.tsx)

Updated font dropdown with:
- Upload button at the top (sticky)
- Separated "System Fonts" section
- "Custom Fonts" section showing uploaded fonts
- File input accepting `.ttf`, `.otf`, `.woff`, `.woff2`
- Loading state during upload

**User Flow**:
1. User clicks font dropdown
2. Clicks "커스텀 폰트 업로드" button
3. Selects font file from device
4. Font uploads to Supabase Storage
5. Font loads into browser
6. Font automatically applied to selected text
7. Font appears in "커스텀 폰트" section

### 7. Design Service Integration

**File**: [lib/designService.ts](lib/designService.ts)

#### Save Design
- `SaveDesignData` now includes `customFonts?: FontMetadata[]`
- Fonts saved to `saved_designs.custom_fonts` column

#### Update Design
- Updates `custom_fonts` field when provided

#### Delete Design
**Smart Cleanup Logic**:
1. Fetch design's custom fonts
2. Query `order_items` to check if fonts are used in any orders
3. Only delete fonts NOT referenced in orders
4. Preserve fonts that are still needed

### 8. Font Loading on Design Load

**File**: [app/components/DesignEditModal.tsx](app/components/DesignEditModal.tsx)

When a design is loaded:
1. Extract `custom_fonts` from design data
2. Set fonts in `useFontStore`
3. Load all fonts into browser using FontFace API
4. Fonts ready before canvas state is restored

**File**: [app/editor/[productId]/ProductEditorClient.tsx](app/editor/[productId]/ProductEditorClient.tsx)

When saving a design:
1. Get custom fonts from `useFontStore`
2. Include fonts in `saveDesign()` call
3. Fonts saved with design metadata

## Usage Example

### For Users

1. **Upload a Font**:
   - Select text object
   - Open text style panel
   - Click font dropdown
   - Click "커스텀 폰트 업로드"
   - Select font file (`.ttf`, `.otf`, `.woff`, `.woff2`)
   - Font automatically applied to text

2. **Use Uploaded Font**:
   - Font appears in "커스텀 폰트" section
   - Select any text object
   - Choose custom font from dropdown

3. **Save Design with Fonts**:
   - Save design normally
   - Fonts automatically included
   - Font files stored in Supabase
   - Font metadata saved with design

4. **Load Design with Fonts**:
   - Open saved design
   - Custom fonts automatically downloaded and loaded
   - Text renders with correct fonts

### For Developers

#### Upload a Font Programmatically

```typescript
import { uploadFont } from '@/lib/fontUtils';
import { useFontStore } from '@/store/useFontStore';
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();
const result = await uploadFont(supabase, fontFile);

if (result.success && result.fontMetadata) {
  // Add to store
  useFontStore.getState().addFont(result.fontMetadata);

  // Load into browser
  await useFontStore.getState().loadAllFonts();
}
```

#### Load Custom Fonts

```typescript
import { loadCustomFonts } from '@/lib/fontUtils';
import type { FontMetadata } from '@/lib/fontUtils';

const fonts: FontMetadata[] = [
  {
    fontFamily: 'MyCustomFont',
    fileName: 'custom.ttf',
    url: 'https://supabase.co/storage/.../fonts/123.ttf',
    path: 'fonts/123.ttf',
    uploadedAt: '2025-01-09T12:00:00Z',
    format: 'ttf'
  }
];

await loadCustomFonts(fonts);
```

## File Structure

```
lib/
├── fontUtils.ts              # Font upload/download utilities
├── storage-config.ts          # Storage bucket configuration
├── designService.ts           # Updated with font support
└── supabase-storage.ts        # Storage upload functions

store/
└── useFontStore.ts            # Font state management

app/
├── components/
│   ├── canvas/
│   │   └── TextStylePanel.tsx # UI with upload button
│   └── DesignEditModal.tsx    # Font loading on design open
└── editor/
    └── [productId]/
        └── ProductEditorClient.tsx # Font saving

supabase/migrations/
├── add_custom_fonts_to_saved_designs.sql
└── add_custom_fonts_to_order_items.sql
```

## Database Schema

### saved_designs.custom_fonts

```json
[
  {
    "fontFamily": "MyCustomFont",
    "fileName": "custom-font.ttf",
    "url": "https://supabase.co/.../fonts/123.ttf",
    "path": "fonts/123.ttf",
    "uploadedAt": "2025-01-09T12:00:00Z",
    "format": "ttf"
  }
]
```

### order_items.custom_fonts

Same structure as above. Snapshot taken at order creation time.

## Font Cleanup Strategy

Fonts are **only deleted** when:
1. A design is deleted
2. The font is NOT referenced in any `order_items.custom_fonts`

This ensures that:
- Fonts used in orders are preserved
- Factory can download fonts for production
- Unused fonts are cleaned up to save storage

## Error Handling

1. **Invalid File Type**: Alert shown to user
2. **Upload Failed**: Error message with details
3. **Font Load Failed**: Logged to console, continues with other fonts
4. **Storage Full**: Handled by Supabase (10MB per file limit)

## Testing Checklist

- [x] Upload .ttf font
- [x] Upload .otf font
- [x] Upload .woff font
- [x] Upload .woff2 font
- [x] Invalid file type rejected
- [x] Font appears in dropdown
- [x] Font applies to text
- [x] Save design with font
- [x] Load design with font
- [x] Font loads from storage
- [x] Delete design (font cleanup)
- [x] Font preserved in orders

## Future Enhancements

1. **Font Preview**: Show font preview in dropdown
2. **Font Management**: Dedicated page to manage uploaded fonts
3. **Font Sharing**: Share fonts across multiple designs
4. **Font Library**: Pre-uploaded popular fonts
5. **Font Metrics**: Track font usage and storage
6. **Font Compression**: Auto-convert to woff2 for smaller size
7. **Font Subsetting**: Include only used characters

## Notes

- Maximum file size: 10MB per font
- Supported formats: TTF, OTF, WOFF, WOFF2
- Fonts are publicly readable but authenticated upload
- Font family name extracted from filename
- Fonts load asynchronously (non-blocking)
- Browser caches loaded fonts automatically
