/**
 * Server-side SVG export utility
 * Extracts text objects from canvas state JSON and generates SVG files
 * Also extracts image URLs from canvas objects for order tracking
 * This runs on the server during order creation
 */

import { uploadSVGToStorage, type UploadResult } from './supabase-storage';
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from './storage-config';
import { SupabaseClient } from '@supabase/supabase-js';

interface CanvasObject {
  type: string;
  text?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  fill?: string;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: string;
  originY?: string;
  textAlign?: string;
  lineHeight?: number;
  data?: {
    id?: string;
    objectId?: string;
    printMethod?: string;
    [key: string]: unknown;
  };
}

interface CanvasState {
  version?: string;
  objects?: CanvasObject[];
}

interface SVGExportResult {
  svg: string;
  uploadResult?: UploadResult;
  textObjectCount: number;
  objectSvgs: Array<{
    objectId: string;
    canvasObjectIndex: number;
    svg: string;
    printMethod?: string;
  }>;
}

export type TextSvgObjectExports = Record<string, Record<string, string>>;
export interface TextSvgExports {
  __objects?: TextSvgObjectExports;
  [sideId: string]: string | TextSvgObjectExports | undefined;
}

/**
 * Extract text objects from canvas state and convert to SVG
 * @param canvasState - The canvas state JSON from saved_designs or order_items
 * @param sideId - The side identifier (e.g., "front", "back")
 * @returns SVG content and metadata
 */
export function extractTextFromCanvasState(
  canvasState: CanvasState,
  sideId: string = 'canvas'
): SVGExportResult {
  if (!canvasState || !canvasState.objects || canvasState.objects.length === 0) {
    return {
      svg: '',
      textObjectCount: 0,
      objectSvgs: [],
    };
  }

  const textObjects = canvasState.objects
    .map((obj, canvasObjectIndex) => ({ obj, canvasObjectIndex }))
    .filter(({ obj }) => {
      // Filter for text objects only (case-insensitive to handle both Fabric.js v5 and v6)
      const type = obj.type?.toLowerCase();
      return type === 'i-text' || type === 'itext' || type === 'text' || type === 'textbox';
    });

  if (textObjects.length === 0) {
    return {
      svg: '',
      textObjectCount: 0,
      objectSvgs: [],
    };
  }

  // Fit the combined SVG to the overall bounds of all text objects.
  // Uses each object's width/height (+ scale) to compute bounds.
  const bounds = calculateOverallObjectBounds(textObjects);
  const canvasWidth = bounds.width;
  const canvasHeight = bounds.height;

  // Create SVG header
  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${canvasWidth}"
     height="${canvasHeight}"
     viewBox="0 0 ${canvasWidth} ${canvasHeight}"
     style="background: none;">
  <title>${sideId} Text Objects</title>
`;

  // Add metadata
  svgContent += `  <metadata>
    <description>Text objects exported for production - ${sideId}</description>
    <created>${new Date().toISOString()}</created>
  </metadata>
`;

  // Add a group for all text objects, translated so the overall bounds start at (0,0)
  svgContent += `  <g id="text-objects" transform="translate(${formatSvgNumber(-bounds.minX)}, ${formatSvgNumber(-bounds.minY)})">\n`;

  const objectSvgs: SVGExportResult['objectSvgs'] = [];

  // Process each text object
  textObjects.forEach(({ obj: textObj, canvasObjectIndex }, index) => {
    const objectId = getCanvasObjectId(textObj, sideId, canvasObjectIndex, index);
    const text = textObj.text || '';
    const fontFamily = textObj.fontFamily || 'Arial';
    const fontSize = textObj.fontSize || 16;
    const fill = typeof textObj.fill === 'string' ? textObj.fill : '#000000';
    const fontWeight = textObj.fontWeight?.toString() || 'normal';
    const fontStyle = textObj.fontStyle || 'normal';
    const textAlign = textObj.textAlign || 'left';

    // Calculate position
    const left = textObj.left || 0;
    const top = textObj.top || 0;
    const angle = textObj.angle || 0; 
    const scaleX = textObj.scaleX || 1;
    const scaleY = textObj.scaleY || 1;

    // Build transform string
    let transform = `translate(${left}, ${top})`;
    if (angle !== 0) {
      transform += ` rotate(${angle})`;
    }
    if (scaleX !== 1 || scaleY !== 1) {
      transform += ` scale(${scaleX}, ${scaleY})`;
    }

    // Determine text anchor based on alignment
    let textAnchor = 'start';
    if (textAlign === 'center') textAnchor = 'middle';
    else if (textAlign === 'right') textAnchor = 'end';

    // Add print method as data attribute if available
    const printMethod = textObj.data?.printMethod || '';
    const dataAttrs =
      ` data-object-id="${escapeXml(objectId)}"` +
      ` data-canvas-index="${canvasObjectIndex}"` +
      (printMethod ? ` data-print-method="${escapeXml(printMethod)}"` : '');

    // Create SVG text element
    svgContent += `    <text
      id="${escapeXml(sanitizeSvgId(`text-${sideId}-${objectId}-${index}`))}"
      x="0"
      y="0"
      font-family="${escapeXml(fontFamily)}"
      font-size="${fontSize}"
      fill="${escapeXml(fill)}"
      font-weight="${escapeXml(fontWeight)}"
      font-style="${escapeXml(fontStyle)}"
      text-anchor="${textAnchor}"
      transform="${transform}"${dataAttrs}>`;

    // Handle multi-line text
    const lines = text.split('\n');
    if (lines.length > 1) {
      lines.forEach((line, lineIndex) => {
        const dy = lineIndex === 0 ? 0 : fontSize * 1.2;
        svgContent += `\n      <tspan x="0" dy="${dy}">${escapeXml(line)}</tspan>`;
      });
      svgContent += '\n    </text>\n';
    } else {
      svgContent += `${escapeXml(text)}</text>\n`;
    }

    const perObjectSvg = createPerObjectTextSvg({
      sideId,
      objectId,
      canvasObjectIndex,
      text,
      fontFamily,
      fontSize,
      fill,
      fontWeight,
      fontStyle,
      textAlign,
      lineHeight: typeof textObj.lineHeight === 'number' ? textObj.lineHeight : undefined,
      width: textObj.width,
      height: textObj.height,
      scaleX,
      scaleY,
      angle,
      printMethod: printMethod || undefined,
    });

    if (perObjectSvg) {
      objectSvgs.push(perObjectSvg);
    }
  });

  // Close SVG tags
  svgContent += '  </g>\n</svg>';

  return {
    svg: svgContent,
    textObjectCount: textObjects.length,
    objectSvgs,
  };
}

/**
 * Extract text from all sides in canvas state and upload to Supabase
 * @param supabase - Supabase client instance (must be server client)
 * @param canvasStateMap - Map of side IDs to canvas states (e.g., { "front": {...}, "back": {...} })
 * @param orderItemId - The order item ID for unique filename
 * @returns Map of side IDs to SVG URLs
 */
export async function exportAndUploadTextFromCanvasState(
  supabase: SupabaseClient,
  canvasStateMap: Record<string, CanvasState | string>,
  orderItemId: string
): Promise<TextSvgExports> {
  const combinedResults: Record<string, string> = {};
  const objectResults: TextSvgObjectExports = {};

  for (const [sideId, canvasStateRaw] of Object.entries(canvasStateMap)) {
    try {
      // Parse canvas state if it's a JSON string
      let canvasState: CanvasState;
      if (typeof canvasStateRaw === 'string') {
        canvasState = JSON.parse(canvasStateRaw);
      } else {
        canvasState = canvasStateRaw;
      }

      // Extract SVG from canvas state
      const { svg, textObjectCount, objectSvgs } = extractTextFromCanvasState(canvasState, sideId);

      // Skip if no text objects
      if (!svg || textObjectCount === 0) {
        console.log(`No text objects found for ${sideId}, skipping SVG export`);
        continue;
      }

      // Avoid uploading "twice" for the same side:
      // If per-object SVGs exist, upload only those (combined side SVG becomes optional).
      if (objectSvgs.length > 0) {
        const sideObjectResults: Record<string, string> = {};

        for (const objectSvg of objectSvgs) {
          const safeObjectId = sanitizePathSegment(objectSvg.objectId);
          const fileName = `order-${orderItemId}-${sideId}-${safeObjectId}.svg`;

          const objectUpload = await uploadSVGToStorage(
            supabase,
            objectSvg.svg,
            STORAGE_BUCKETS.TEXT_EXPORTS,
            STORAGE_FOLDERS.SVG,
            fileName
          );

          if (objectUpload.success && objectUpload.url) {
            sideObjectResults[objectSvg.objectId] = objectUpload.url;
          } else {
            console.error(
              `Failed to upload object SVG for ${sideId}/${objectSvg.objectId}:`,
              objectUpload.error
            );
          }
        }

        if (Object.keys(sideObjectResults).length > 0) {
          objectResults[sideId] = sideObjectResults;
        }
      } else {
        // Fallback: upload a single combined side SVG if we couldn't produce per-object SVGs.
        const uploadResult = await uploadSVGToStorage(
          supabase,
          svg,
          STORAGE_BUCKETS.TEXT_EXPORTS,
          STORAGE_FOLDERS.SVG,
          `order-${orderItemId}-${sideId}.svg`
        );

        if (uploadResult.success && uploadResult.url) {
          combinedResults[sideId] = uploadResult.url;
          console.log(`SVG uploaded for ${sideId}: ${uploadResult.url}`);
        } else {
          console.error(`Failed to upload SVG for ${sideId}:`, uploadResult.error);
        }
      }
    } catch (error) {
      console.error(`Error exporting SVG for ${sideId}:`, error);
    }
  }

  if (Object.keys(objectResults).length === 0) {
    return combinedResults;
  }

  return {
    ...combinedResults,
    __objects: objectResults,
  };
}

/**
 * Helper function to escape XML special characters
 */
function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeSvgId(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '_');
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.length > 120 ? sanitized.slice(0, 120) : sanitized;
}

function getCanvasObjectId(
  obj: CanvasObject,
  sideId: string,
  canvasObjectIndex: number,
  textIndex: number
): string {
  const fromData = obj.data?.objectId || obj.data?.id;
  if (fromData && typeof fromData === 'string') return fromData;
  return `${sideId}-${canvasObjectIndex}-${textIndex}`;
}

function formatSvgNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

function calculateScaledRotatedBbox(options: {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angleDeg: number;
}): { minX: number; minY: number; width: number; height: number } {
  const { width, height, scaleX, scaleY, angleDeg } = options;
  const halfW = (width / 2) * scaleX;
  const halfH = (height / 2) * scaleY;
  const theta = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const points = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ].map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function calculateOverallObjectBounds(
  textObjects: Array<{ obj: CanvasObject; canvasObjectIndex: number }>
): { minX: number; minY: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  textObjects.forEach(({ obj }) => {
    const left = typeof obj.left === 'number' ? obj.left : 0;
    const top = typeof obj.top === 'number' ? obj.top : 0;
    const scaleX = typeof obj.scaleX === 'number' ? obj.scaleX : 1;
    const scaleY = typeof obj.scaleY === 'number' ? obj.scaleY : 1;

    const fontSize = typeof obj.fontSize === 'number' && obj.fontSize > 0 ? obj.fontSize : 16;
    const lineHeight = typeof obj.lineHeight === 'number' && obj.lineHeight > 0 ? obj.lineHeight : 1.2;
    const baseSize = estimateTextBoxSize({ text: obj.text || '', fontSize, lineHeight });

    const width = typeof obj.width === 'number' && obj.width > 0 ? obj.width : baseSize.width;
    const height = typeof obj.height === 'number' && obj.height > 0 ? obj.height : baseSize.height;

    // NOTE: This is an axis-aligned bounds approximation and doesn't include rotation.
    const right = left + width * scaleX;
    const bottom = top + height * scaleY;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return { minX: 0, minY: 0, width: 1, height: 1 };
  }

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function estimateTextBoxSize(options: {
  text: string;
  fontSize: number;
  lineHeight: number;
}): { width: number; height: number } {
  const lines = options.text.split('\n');
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const width = Math.max(1, longestLine * options.fontSize * 0.6);
  const height = Math.max(1, lines.length * options.fontSize * options.lineHeight);
  return { width, height };
}

function createPerObjectTextSvg(options: {
  sideId: string;
  objectId: string;
  canvasObjectIndex: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  lineHeight?: number;
  width?: number;
  height?: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  printMethod?: string;
}): SVGExportResult['objectSvgs'][number] | null {
  const lineHeight = options.lineHeight && options.lineHeight > 0 ? options.lineHeight : 1.2;

  const unscaledWidth =
    typeof options.width === 'number' && options.width > 0
      ? options.width
      : estimateTextBoxSize({ text: options.text, fontSize: options.fontSize, lineHeight }).width;
  const unscaledHeight =
    typeof options.height === 'number' && options.height > 0
      ? options.height
      : estimateTextBoxSize({ text: options.text, fontSize: options.fontSize, lineHeight }).height;

  // The user request is to size the SVG using the object's width/height fields.
  // NOTE: this does not account for rotation; rotated content may exceed the SVG bounds.
  if (
    !Number.isFinite(unscaledWidth) ||
    !Number.isFinite(unscaledHeight) ||
    unscaledWidth <= 0 ||
    unscaledHeight <= 0
  ) {
    return null;
  }

  const textAlign = options.textAlign || 'left';
  const textAnchor =
    textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';

  const x =
    textAnchor === 'start'
      ? -unscaledWidth / 2
      : textAnchor === 'end'
        ? unscaledWidth / 2
        : 0;
  const y = -unscaledHeight / 2;

  const printMethodAttr = options.printMethod
    ? ` data-print-method="${escapeXml(options.printMethod)}"`
    : '';

  const objectIdAttr = ` data-object-id="${escapeXml(options.objectId)}"`;
  const canvasIndexAttr = ` data-canvas-index="${options.canvasObjectIndex}"`;

  const lines = options.text.split('\n');
  const lineStep = options.fontSize * lineHeight;

  let textMarkup = `    <text
      id="${escapeXml(sanitizeSvgId(`text-${options.sideId}-${options.objectId}`))}"
      xml:space="preserve"
      x="${formatSvgNumber(x)}"
      y="${formatSvgNumber(y)}"
      font-family="${escapeXml(options.fontFamily)}"
      font-size="${options.fontSize}"
      fill="${escapeXml(options.fill)}"
      font-weight="${escapeXml(options.fontWeight)}"
      font-style="${escapeXml(options.fontStyle)}"
      text-anchor="${textAnchor}"
      dominant-baseline="hanging"${objectIdAttr}${canvasIndexAttr}${printMethodAttr}>`;

  if (lines.length > 1) {
    lines.forEach((line, lineIndex) => {
      const dy = lineIndex === 0 ? 0 : lineStep;
      textMarkup += `\n      <tspan x="${formatSvgNumber(x)}" dy="${formatSvgNumber(dy)}">${escapeXml(line)}</tspan>`;
    });
    textMarkup += '\n    </text>\n';
  } else {
    textMarkup += `${escapeXml(options.text)}</text>\n`;
  }

  const transformParts: string[] = [];
  // IMPORTANT: SVG transforms are applied in list order.
  // We keep the object centered at origin, then translate it into the [0..w, 0..h] viewBox.
  if (options.scaleX !== 1 || options.scaleY !== 1) {
    transformParts.push(
      `scale(${formatSvgNumber(options.scaleX)}, ${formatSvgNumber(options.scaleY)})`
    );
  }
  if (options.angle) transformParts.push(`rotate(${formatSvgNumber(options.angle)})`);
  transformParts.push(
    `translate(${formatSvgNumber(unscaledWidth / 2)}, ${formatSvgNumber(unscaledHeight / 2)})`
  );

  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${formatSvgNumber(unscaledWidth)}"
     height="${formatSvgNumber(unscaledHeight)}"
     viewBox="0 0 ${formatSvgNumber(unscaledWidth)} ${formatSvgNumber(unscaledHeight)}"
     style="background: none;"
     overflow="hidden">
  <g${transformParts.length ? ` transform="${transformParts.join(' ')}"` : ''}>
${textMarkup}  </g>
</svg>`;

  return {
    objectId: options.objectId,
    canvasObjectIndex: options.canvasObjectIndex,
    svg,
    printMethod: options.printMethod,
  };
}

/**
 * Extract uploaded image URLs from canvas state
 * @param canvasStateMap - Map of side IDs to canvas states
 * @returns Map of side IDs to arrays of image metadata
 */
export function extractImageUrlsFromCanvasState(
  canvasStateMap: Record<string, CanvasState | string>
): Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>> {
  const imageUrls: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>> = {};

  for (const [sideId, canvasStateRaw] of Object.entries(canvasStateMap)) {
    // Parse canvas state if it's a JSON string
    let canvasState: CanvasState;
    try {
      if (typeof canvasStateRaw === 'string') {
        canvasState = JSON.parse(canvasStateRaw);
      } else {
        canvasState = canvasStateRaw;
      }
    } catch (error) {
      console.error(`Failed to parse canvas state for ${sideId}:`, error);
      continue;
    }

    if (!canvasState || !canvasState.objects || canvasState.objects.length === 0) {
      continue;
    }

    // Filter for image objects with Supabase storage data (case-insensitive)
    const imageObjects = canvasState.objects.filter(obj => obj.type?.toLowerCase() === 'image');

    const sideImages: Array<{ url: string; path?: string; uploadedAt?: string }> = [];

    imageObjects.forEach(imgObj => {
      // Check if image has Supabase storage metadata
      const supabaseUrl = imgObj.data?.supabaseUrl;
      const supabasePath = imgObj.data?.supabasePath;
      const uploadedAt = imgObj.data?.uploadedAt;

      if (supabaseUrl) {
        sideImages.push({
          url: String(supabaseUrl),
          path: supabasePath ? String(supabasePath) : undefined,
          uploadedAt: uploadedAt ? String(uploadedAt) : undefined,
        });
      }
    });

    if (sideImages.length > 0) {
      imageUrls[sideId] = sideImages;
    }
  }

  return imageUrls;
}
