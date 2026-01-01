# Supabase Storage Setup & Usage Guide

This guide explains how to set up and use the image upload and SVG export features in the canvas editor.

## Features

1. **Image Upload to Supabase**: When users add images to the canvas, they are automatically uploaded to Supabase Storage
2. **Text to SVG Export**: Extract all text objects (i-text) from the canvas and save them as SVG files to Supabase Storage

---

## Setup Instructions

### 1. Create Storage Buckets

You need to create two public storage buckets in Supabase:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com/project/obxekwyolrmipwmffhwq
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Create the following buckets:
   - **Name**: `user-designs`
   - **Public**: ✅ (checked)
   - Click **Create bucket**

   Repeat for:
   - **Name**: `text-exports`
   - **Public**: ✅ (checked)
   - Click **Create bucket**

#### Option B: Using SQL (Alternative)

Run this SQL in the Supabase SQL Editor:

```sql
-- Create user-designs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-designs', 'user-designs', true);

-- Create text-exports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('text-exports', 'text-exports', true);
```

### 2. Set Up Storage Policies (Optional but Recommended)

For better security, set up Row Level Security (RLS) policies:

```sql
-- Allow public read access to user-designs
CREATE POLICY "Public read access for user-designs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'user-designs' );

-- Allow anyone to upload to user-designs (change to authenticated users in production)
CREATE POLICY "Public upload access for user-designs"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'user-designs' );

-- Allow public read access to text-exports
CREATE POLICY "Public read access for text-exports"
ON storage.objects FOR SELECT
USING ( bucket_id = 'text-exports' );

-- Allow anyone to upload to text-exports
CREATE POLICY "Public upload access for text-exports"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'text-exports' );

-- Optional: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING ( bucket_id IN ('user-designs', 'text-exports') );
```

### 3. Verify Setup

After creating the buckets, verify they appear in your Supabase Storage dashboard.

---

## Usage Examples

### 1. Adding Images to Canvas (Automatic Upload)

When users click the "Add Image" button in the toolbar, images are automatically uploaded to Supabase:

```typescript
// This happens automatically in Toolbar.tsx
// When user selects an image file:
const uploadResult = await uploadFileToStorage(
  file,
  STORAGE_BUCKETS.USER_DESIGNS,
  STORAGE_FOLDERS.IMAGES
);

// The image is then loaded onto the canvas with metadata:
img.data = {
  supabaseUrl: uploadResult.url,
  supabasePath: uploadResult.path,
  uploadedAt: new Date().toISOString(),
};
```

**Storage Location**: `user-designs/images/{timestamp}-{random}.{ext}`

### 2. Exporting Text as SVG

#### Export Current Canvas Text to SVG (No Upload)

```typescript
import { useCanvasStore } from '@/store/useCanvasStore';

function MyComponent() {
  const { exportTextToSVG } = useCanvasStore();

  const handleExport = () => {
    // Export text from current active canvas
    const result = exportTextToSVG();

    if (result && result.svg) {
      console.log('SVG Content:', result.svg);
      console.log('Text Objects:', result.textObjects);

      // Download SVG file locally
      const blob = new Blob([result.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'text-export.svg';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      console.log('No text objects found');
    }
  };

  return <button onClick={handleExport}>Export Text as SVG</button>;
}
```

#### Export and Upload Text to Supabase

```typescript
import { useCanvasStore } from '@/store/useCanvasStore';

function MyComponent() {
  const { exportAndUploadTextToSVG } = useCanvasStore();

  const handleExportAndUpload = async () => {
    // Export and upload to Supabase
    const result = await exportAndUploadTextToSVG();

    if (result && result.uploadResult?.success) {
      console.log('SVG uploaded to:', result.uploadResult.url);
      console.log('Storage path:', result.uploadResult.path);
      alert(`SVG saved! URL: ${result.uploadResult.url}`);
    } else {
      console.error('Upload failed:', result?.uploadResult?.error);
    }
  };

  return <button onClick={handleExportAndUpload}>Save Text as SVG</button>;
}
```

**Storage Location**: `text-exports/svg/text-{sideId}-{timestamp}-{random}.svg`

#### Export All Canvases Text to SVG

```typescript
import { useCanvasStore } from '@/store/useCanvasStore';

function MyComponent() {
  const { exportAndUploadAllTextToSVG } = useCanvasStore();

  const handleExportAll = async () => {
    // Export text from all canvas sides
    const results = await exportAndUploadAllTextToSVG();

    Object.entries(results).forEach(([sideId, result]) => {
      if (result.uploadResult?.success) {
        console.log(`${sideId}:`, result.uploadResult.url);
      }
    });
  };

  return <button onClick={handleExportAll}>Export All Sides</button>;
}
```

### 3. Using the Storage Utilities Directly

You can also use the storage utilities directly for custom uploads:

```typescript
import {
  uploadFileToStorage,
  uploadDataUrlToStorage,
  uploadSVGToStorage,
  deleteFileFromStorage
} from '@/lib/supabase-storage';
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from '@/lib/storage-config';

// Upload a file
const result = await uploadFileToStorage(
  file,
  STORAGE_BUCKETS.USER_DESIGNS,
  'custom-folder'
);

// Upload a data URL (base64)
const dataUrlResult = await uploadDataUrlToStorage(
  'data:image/png;base64,...',
  STORAGE_BUCKETS.USER_DESIGNS,
  STORAGE_FOLDERS.IMAGES
);

// Upload SVG content
const svgResult = await uploadSVGToStorage(
  '<svg>...</svg>',
  STORAGE_BUCKETS.TEXT_EXPORTS,
  STORAGE_FOLDERS.SVG,
  'my-custom-name.svg'
);

// Delete a file
await deleteFileFromStorage(
  STORAGE_BUCKETS.USER_DESIGNS,
  'images/12345.png'
);
```

---

## File Structure

```
lib/
├── supabase-storage.ts       # Storage utility functions
├── storage-config.ts          # Bucket and folder configuration
└── canvas-svg-export.ts       # SVG export utilities

store/
└── useCanvasStore.ts          # Canvas store with export methods

types/
└── types.ts                   # TypeScript type definitions
```

---

## API Reference

### Canvas Store Methods

#### `exportTextToSVG(sideId?: string)`
- **Returns**: `SVGExportResult | null`
- **Description**: Export text objects from a specific canvas to SVG (no upload)
- **Parameters**:
  - `sideId` (optional): Canvas side ID. If not provided, uses active canvas

#### `exportAndUploadTextToSVG(sideId?: string)`
- **Returns**: `Promise<SVGExportResult | null>`
- **Description**: Export text objects to SVG and upload to Supabase
- **Parameters**:
  - `sideId` (optional): Canvas side ID. If not provided, uses active canvas

#### `exportAllTextToSVG()`
- **Returns**: `Record<string, SVGExportResult>`
- **Description**: Export text objects from all canvases to SVG (no upload)

#### `exportAndUploadAllTextToSVG()`
- **Returns**: `Promise<Record<string, SVGExportResult>>`
- **Description**: Export text objects from all canvases to SVG and upload to Supabase

### Storage Utility Functions

#### `uploadFileToStorage(file, bucket, folder?)`
- Upload a File object to Supabase Storage

#### `uploadDataUrlToStorage(dataUrl, bucket, folder?, filename?)`
- Upload a base64 data URL to Supabase Storage

#### `uploadSVGToStorage(svgContent, bucket, folder?, filename?)`
- Upload SVG content string to Supabase Storage

#### `deleteFileFromStorage(bucket, path)`
- Delete a file from Supabase Storage

---

## Troubleshooting

### Images fail to upload
- Check that the `user-designs` bucket exists and is public
- Verify your Supabase URL and anon key in `.env.local`
- Check browser console for CORS errors

### SVG export returns empty
- Ensure there are text objects (i-text) on the canvas
- Text objects added via the toolbar should work automatically

### Storage bucket not found
- Create the buckets using the setup instructions above
- Verify bucket names match exactly: `user-designs` and `text-exports`

### CORS errors when loading images
- Ensure buckets are set to **public**
- Check that CORS is enabled in Supabase Storage settings

---

## Production Recommendations

1. **Authentication**: Require users to be authenticated before uploading
2. **File Size Limits**: Add client-side file size validation (e.g., max 5MB)
3. **Rate Limiting**: Implement rate limiting on uploads
4. **File Type Validation**: Validate file types on both client and server
5. **Storage Quotas**: Monitor storage usage and set up quotas per user
6. **Cleanup**: Implement automatic cleanup of unused uploads
7. **CDN**: Consider using a CDN for better image delivery performance

---

## Next Steps

- [ ] Add loading indicators when uploading images
- [ ] Implement upload progress tracking
- [ ] Add image optimization/compression before upload
- [ ] Create admin dashboard to view all uploaded assets
- [ ] Implement user-specific folders for authenticated users
- [ ] Add batch delete functionality for old uploads
