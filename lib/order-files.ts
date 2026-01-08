/**
 * Utility functions for managing order item files
 * Helps retrieve and download all associated images and SVGs
 */

export interface OrderItemFile {
  type: 'image' | 'svg';
  side: string;
  url: string;
  kind?: 'combined' | 'object';
  objectId?: string;
  path?: string;
  uploadedAt?: string;
}

export interface OrderItemFiles {
  images: OrderItemFile[];
  svgs: OrderItemFile[];
  allFiles: OrderItemFile[];
}

/**
 * Extract all file URLs from an order item
 * @param orderItem - Order item with text_svg_exports and image_urls
 * @returns Organized file information
 */
export function getOrderItemFiles(orderItem: {
  text_svg_exports?: Record<string, unknown>;
  image_urls?: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>>;
}): OrderItemFiles {
  const images: OrderItemFile[] = [];
  const svgs: OrderItemFile[] = [];

  // Extract image files
  if (orderItem.image_urls) {
    Object.entries(orderItem.image_urls).forEach(([side, sideImages]) => {
      if (Array.isArray(sideImages)) {
        sideImages.forEach(img => {
          images.push({
            type: 'image',
            side,
            url: img.url,
            path: img.path,
            uploadedAt: img.uploadedAt,
          });
        });
      }
    });
  }

  // Extract SVG files
  if (orderItem.text_svg_exports) {
    const { combined, objects } = extractSvgExports(orderItem.text_svg_exports);

    combined.forEach(({ side, url }) => {
      svgs.push({
        type: 'svg',
        side,
        url,
        kind: 'combined',
      });
    });

    objects.forEach(({ side, objectId, url }) => {
      svgs.push({
        type: 'svg',
        side,
        url,
        kind: 'object',
        objectId,
      });
    });
  }

  return {
    images,
    svgs,
    allFiles: [...images, ...svgs],
  };
}

/**
 * Download a file from a URL
 * @param url - File URL
 * @param filename - Desired filename
 */
export async function downloadFile(url: string, filename?: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    // Determine filename
    const finalFilename = filename || url.split('/').pop() || 'download';

    // Create download link
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Download all files for an order item
 * @param orderItem - Order item with file URLs
 * @param filenamePrefix - Optional prefix for filenames
 */
export async function downloadAllOrderItemFiles(
  orderItem: {
    id: string;
    product_title: string;
    text_svg_exports?: Record<string, unknown>;
    image_urls?: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>>;
  },
  filenamePrefix?: string
): Promise<void> {
  const files = getOrderItemFiles(orderItem);
  const prefix = filenamePrefix || `order-${orderItem.id}`;

  // Download all images
  for (const [index, image] of files.images.entries()) {
    const ext = image.url.split('.').pop() || 'jpg';
    const filename = `${prefix}-${image.side}-image-${index + 1}.${ext}`;
    await downloadFile(image.url, filename);

    // Small delay between downloads to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Download all SVGs
  for (const svg of files.svgs) {
    const filename =
      svg.kind === 'object' && svg.objectId
        ? `${prefix}-${svg.side}-text-${svg.objectId}.svg`
        : `${prefix}-${svg.side}-text.svg`;
    await downloadFile(svg.url, filename);

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Get file count summary for an order item
 * @param orderItem - Order item with file URLs
 * @returns File count summary
 */
export function getOrderItemFileCount(orderItem: {
  text_svg_exports?: Record<string, unknown>;
  image_urls?: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>>;
}): { images: number; svgs: number; total: number } {
  const files = getOrderItemFiles(orderItem);

  return {
    images: files.images.length,
    svgs: files.svgs.length,
    total: files.allFiles.length,
  };
}

/**
 * Format file size from bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractSvgExports(textSvgExports: unknown): {
  combined: Array<{ side: string; url: string }>;
  objects: Array<{ side: string; objectId: string; url: string }>;
} {
  const combined: Array<{ side: string; url: string }> = [];
  const objects: Array<{ side: string; objectId: string; url: string }> = [];

  if (!isRecord(textSvgExports)) {
    return { combined, objects };
  }

  // Combined side SVGs: { [sideId]: "https://..." }
  Object.entries(textSvgExports).forEach(([key, value]) => {
    if (key === '__objects') return;
    if (typeof value !== 'string') return;
    combined.push({ side: key, url: value });
  });

  // Per-object SVGs: { __objects: { [sideId]: { [objectId]: "https://..." } } }
  const perObject = textSvgExports.__objects;
  if (!isRecord(perObject)) {
    return { combined, objects };
  }

  Object.entries(perObject).forEach(([sideId, sideMap]) => {
    if (!isRecord(sideMap)) return;
    Object.entries(sideMap).forEach(([objectId, url]) => {
      if (typeof url !== 'string') return;
      objects.push({ side: sideId, objectId, url });
    });
  });

  return { combined, objects };
}
