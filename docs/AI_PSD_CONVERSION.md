# AI/PSD File Conversion Feature

This document explains how the AI (Adobe Illustrator) and PSD (Photoshop) file conversion feature works in the product customization application.

## Overview

Users can now upload AI and PSD files to the canvas. The system automatically:
1. Converts the AI/PSD file to PNG format for canvas display
2. Uploads the **original** AI/PSD file to Supabase Storage
3. Uploads the converted PNG file to Supabase Storage for display
4. Displays the PNG version on the canvas while preserving the original file

## Architecture

The conversion uses a **client-server architecture**:

- **Client-side** ([lib/cloudconvert.ts](../lib/cloudconvert.ts)): Lightweight wrapper that sends files to the API
- **Server-side** ([app/api/convert-image/route.ts](../app/api/convert-image/route.ts)): API route that handles CloudConvert integration

This architecture is necessary because the `cloudconvert` npm package requires Node.js modules (like `fs`) that aren't available in the browser. The client component calls the server API route, which then interacts with CloudConvert.

## Setup

### 1. Install CloudConvert Package

The CloudConvert package has already been installed:

```bash
npm install cloudconvert
```

### 2. Get CloudConvert API Key

1. Sign up or log in at [CloudConvert](https://cloudconvert.com)
2. Navigate to [API Keys Dashboard](https://cloudconvert.com/dashboard/api/v2/keys)
3. Create a new API key with the following permissions:
   - `task.read`
   - `task.write`
   - `job.read`
   - `job.write`
4. Copy the API key

### 3. Configure Environment Variables

Add your CloudConvert API key to `.env.local`:

```env
NEXT_PUBLIC_CLOUDCONVERT_API_KEY=your_actual_cloudconvert_api_key_here
```

**Important**: Replace `your_cloudconvert_api_key_here` with your actual API key from step 2.

## How It Works

### User Flow

1. User clicks the "이미지" (Image) button in the toolbar
2. File picker opens accepting: `image/*`, `.ai`, `.psd`
3. User selects an AI or PSD file
4. System shows: "파일을 변환하는 중입니다. 잠시만 기다려주세요..." (Converting file, please wait...)
5. File is converted to PNG via CloudConvert
6. Both original file and PNG are uploaded to Supabase
7. PNG is displayed on the canvas
8. Success message: "파일이 성공적으로 변환되어 추가되었습니다!" (File successfully converted and added!)

### Technical Flow

```
CLIENT SIDE                          SERVER SIDE
┌─────────────────┐
│  User selects   │
│  AI/PSD file    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check file     │
│  extension      │
│ (Toolbar.tsx)   │
└────────┬────────┘
         │
         ▼ (AI/PSD detected)
┌─────────────────┐
│  Call API route │────────────────>  ┌──────────────────┐
│ /api/convert    │                   │  API Route       │
│  with file      │                   │  Receives file   │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  CloudConvert    │
                                      │  API converts    │
                                      │  to PNG          │
                                      └────────┬─────────┘
                                               │
┌─────────────────┐                            │
│  Receive PNG    │<───────────────────────────┘
│  blob from API  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload ORIGINAL│
│  AI/PSD file to │
│  Supabase       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload converted│
│  PNG to Supabase│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load PNG into  │
│  Fabric.js canvas│
└─────────────────┘
```

## File Structure

### New Files Created

- **`app/api/convert-image/route.ts`**: Server-side API route for CloudConvert
  - Handles the actual CloudConvert API integration
  - Receives file from client, converts it, returns PNG blob
  - Only runs on server where Node.js modules are available

- **`lib/cloudconvert.ts`**: Client-side CloudConvert utility functions
  - `convertToPNG()`: Calls the API route to convert AI/PSD to PNG
  - `isAiOrPsdFile()`: Checks if file is AI or PSD
  - `getConversionErrorMessage()`: Returns user-friendly error messages

### Modified Files

- **`app/components/canvas/Toolbar.tsx`**: Updated `addImage()` function
  - Accepts AI/PSD files in file picker
  - Detects file type and triggers conversion
  - Uploads both original and converted files
  - Stores metadata in canvas object

- **`.env.local`**: Added CloudConvert API key

## Canvas Object Metadata

When an AI/PSD file is added to the canvas, the following metadata is stored in the Fabric.js object's `data` property:

```typescript
{
  supabaseUrl: string;           // URL of PNG for display
  supabasePath: string;          // Path to original file
  originalFileUrl: string;       // URL of original AI/PSD
  originalFileName: string;      // e.g., "design.ai"
  fileType: string;              // MIME type
  isConverted: boolean;          // true for AI/PSD, false for regular images
  uploadedAt: string;            // ISO timestamp
}
```

## API Usage & Costs

CloudConvert charges based on conversion minutes. Pricing as of 2025:

- Free tier: 25 conversion minutes/month
- Pay-as-you-go: ~$8.33 per 1000 conversion minutes
- AI/PSD conversions typically take 1-10 seconds depending on file complexity

**Recommendation**: Monitor usage in the [CloudConvert Dashboard](https://cloudconvert.com/dashboard)

## Error Handling

The system handles various error scenarios:

| Error | User Message (Korean) |
|-------|----------------------|
| Missing API key | CloudConvert API 키가 설정되지 않았습니다. |
| Upload failed | 파일 업로드에 실패했습니다. 다시 시도해주세요. |
| Conversion failed | 파일 변환에 실패했습니다. 파일이 손상되었을 수 있습니다. |
| Generic error | 파일 변환 중 오류가 발생했습니다: [error details] |

## Supported Formats

### Input Formats
- ⚠️ `.ai` (Adobe Illustrator) - **Limited Support**: CloudConvert may have limited support for AI files. If conversion fails, consider converting to PDF or SVG first.
- ✅ `.psd` (Adobe Photoshop) - **Fully Supported**
- ✅ All standard image formats (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, etc.)

### Output Format
- Always converts to `.png` for canvas display
- Original AI/PSD file is preserved in storage

### Important Notes on AI Files

Adobe Illustrator (.ai) files may have limited support in CloudConvert. If you encounter errors:

1. **Recommended Workaround**: Convert AI files to PDF or SVG in Adobe Illustrator first
2. **Alternative**: Use online converters to convert AI → PNG before uploading
3. CloudConvert's support for AI files depends on the AI file version and complexity

For production use, we recommend:
- Using PSD files for raster graphics (photos, complex designs)
- Converting AI files to SVG or PDF before upload

## Testing

To test the feature:

1. Ensure CloudConvert API key is configured in `.env.local`
2. Start the development server: `npm run dev`
3. Open the product designer
4. Click the "이미지" button
5. Select an AI or PSD file
6. Verify:
   - Loading message appears
   - Conversion completes successfully
   - Image displays on canvas
   - Success message shows

## Troubleshooting

### "CloudConvert API 키가 설정되지 않았습니다"

**Solution**: Add your API key to `.env.local` and restart the dev server

### Conversion Takes Too Long

**Possible causes**:
- Large file size (>50MB)
- Complex vector graphics with many layers
- CloudConvert API slowness

**Solution**: Try with a smaller/simpler file first

### "파일 변환에 실패했습니다"

**Possible causes**:
- Corrupted AI/PSD file
- Unsupported AI/PSD version
- CloudConvert API quota exceeded

**Solution**:
- Verify file opens in Adobe software
- Check CloudConvert dashboard for quota limits
- Try a different file

## Future Enhancements

Potential improvements for this feature:

- [ ] Add loading spinner instead of alert
- [ ] Show conversion progress
- [ ] Support batch conversion
- [ ] Add conversion quality settings
- [ ] Support SVG output option
- [ ] Cache converted files to avoid re-conversion
- [ ] Add file size limits before conversion

## References

- [CloudConvert API Documentation](https://cloudconvert.com/api/v2)
- [CloudConvert Node.js SDK](https://github.com/cloudconvert/cloudconvert-node)
- [Fabric.js Documentation](http://fabricjs.com/docs/)
