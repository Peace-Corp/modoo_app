import { SupabaseClient } from '@supabase/supabase-js';
import { uploadFileToStorage, deleteFileFromStorage, UploadResult } from './supabase-storage';
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from './storage-config';

export interface FontMetadata {
  fontFamily: string; // Display name/family name
  fileName: string; // Original file name
  url: string; // Public URL from Supabase
  path: string; // Storage path for deletion
  uploadedAt: string; // ISO timestamp
  format: 'ttf' | 'otf' | 'woff' | 'woff2'; // Font format
}

/**
 * Supported font file extensions
 */
const SUPPORTED_FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2'] as const;

/**
 * Check if a file is a valid font file
 */
export function isValidFontFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_FONT_EXTENSIONS.includes(ext as any);
}

/**
 * Upload a font file to Supabase Storage
 * @param supabase - Supabase client instance
 * @param fontFile - The font file to upload
 * @param designId - Optional design ID to associate with the font
 * @returns Upload result with font metadata
 */
export async function uploadFont(
  supabase: SupabaseClient,
  fontFile: File,
  designId?: string
): Promise<{ success: boolean; fontMetadata?: FontMetadata; error?: string }> {
  try {
    // Validate font file
    if (!isValidFontFile(fontFile)) {
      return {
        success: false,
        error: 'Invalid font file. Supported formats: .ttf, .otf, .woff, .woff2',
      };
    }

    // Extract font family name from file name (remove extension)
    const fontFamily = fontFile.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
    const format = fontFile.name.split('.').pop()?.toLowerCase() as FontMetadata['format'];

    // Generate unique file name with design ID if provided
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(7);
    const designPrefix = designId ? `${designId}-` : '';
    const fileName = `${designPrefix}${timestamp}-${uniqueId}.${format}`;

    // Upload to Supabase Storage
    const uploadResult: UploadResult = await uploadFileToStorage(
      supabase,
      fontFile,
      STORAGE_BUCKETS.FONTS,
      STORAGE_FOLDERS.FONTS
    );

    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload font',
      };
    }

    // Create font metadata
    const fontMetadata: FontMetadata = {
      fontFamily,
      fileName: fontFile.name,
      url: uploadResult.url,
      path: uploadResult.path,
      uploadedAt: new Date().toISOString(),
      format,
    };

    return {
      success: true,
      fontMetadata,
    };
  } catch (error) {
    console.error('Error uploading font:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load a custom font dynamically using FontFace API
 * @param fontMetadata - Font metadata with URL and family name
 * @returns Promise that resolves when font is loaded
 */
export async function loadCustomFont(fontMetadata: FontMetadata): Promise<void> {
  try {
    // Check if font is already loaded
    const existingFonts = document.fonts;
    const alreadyLoaded = Array.from(existingFonts).some(
      (font) => font.family === fontMetadata.fontFamily
    );

    if (alreadyLoaded) {
      console.log(`Font "${fontMetadata.fontFamily}" is already loaded`);
      return;
    }

    // Create and load FontFace
    const fontFace = new FontFace(fontMetadata.fontFamily, `url(${fontMetadata.url})`);
    const loadedFont = await fontFace.load();

    // Add to document fonts
    document.fonts.add(loadedFont);

    console.log(`Successfully loaded font: ${fontMetadata.fontFamily}`);
  } catch (error) {
    console.error(`Failed to load font "${fontMetadata.fontFamily}":`, error);
    throw error;
  }
}

/**
 * Load multiple custom fonts
 * @param fonts - Array of font metadata
 * @returns Promise that resolves when all fonts are loaded
 */
export async function loadCustomFonts(fonts: FontMetadata[]): Promise<void> {
  const loadPromises = fonts.map((font) => loadCustomFont(font));
  await Promise.all(loadPromises);
}

/**
 * Delete a font file from storage
 * @param supabase - Supabase client instance
 * @param fontPath - Storage path of the font file
 * @returns Success status
 */
export async function deleteFont(
  supabase: SupabaseClient,
  fontPath: string
): Promise<{ success: boolean; error?: string }> {
  return await deleteFileFromStorage(supabase, STORAGE_BUCKETS.FONTS, fontPath);
}

/**
 * Delete multiple font files from storage
 * @param supabase - Supabase client instance
 * @param fontPaths - Array of storage paths
 * @returns Success status
 */
export async function deleteFonts(
  supabase: SupabaseClient,
  fontPaths: string[]
): Promise<{ success: boolean; errors: string[] }> {
  const results = await Promise.all(
    fontPaths.map((path) => deleteFont(supabase, path))
  );

  const errors = results
    .filter((result) => !result.success)
    .map((result) => result.error || 'Unknown error');

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Get font format from font metadata
 */
export function getFontFormat(fontMetadata: FontMetadata): string {
  const formatMap: Record<FontMetadata['format'], string> = {
    ttf: 'truetype',
    otf: 'opentype',
    woff: 'woff',
    woff2: 'woff2',
  };
  return formatMap[fontMetadata.format] || 'truetype';
}

/**
 * Create a @font-face CSS rule for a custom font
 * @param fontMetadata - Font metadata
 * @returns CSS @font-face rule string
 */
export function createFontFaceCSS(fontMetadata: FontMetadata): string {
  const format = getFontFormat(fontMetadata);
  return `
@font-face {
  font-family: '${fontMetadata.fontFamily}';
  src: url('${fontMetadata.url}') format('${format}');
  font-display: swap;
}
  `.trim();
}
