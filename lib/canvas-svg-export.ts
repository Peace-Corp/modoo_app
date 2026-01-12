import * as fabric from 'fabric';
import { uploadSVGToStorage, UploadResult } from './supabase-storage';
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from './storage-config';
import { SupabaseClient } from '@supabase/supabase-js';
import { CurvedText, isCurvedText } from './curvedText';

export interface TextObjectData {
  objectId?: string;
  canvasObjectIndex?: number;
  printMethod?: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  left: number;
  top: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  // CurvedText specific properties
  curveIntensity?: number;
  isCurvedText?: boolean;
}

export interface TextObjectSVGExport {
  objectId: string;
  canvasObjectIndex: number;
  svg: string;
  svgDataUrl: string;
  uploadResult?: UploadResult;
  textObject: TextObjectData;
}

export interface SVGExportResult {
  svg: string;
  uploadResult?: UploadResult;
  textObjects: TextObjectData[];
  objectSvgs: TextObjectSVGExport[];
}

/**
 * Extract all text objects (i-text, text, textbox, curvedtext) from a canvas and convert to SVG
 * @param canvas - Fabric.js canvas instance
 * @returns SVG string containing all text objects
 */
export function extractTextObjectsToSVG(canvas: fabric.Canvas): SVGExportResult {
  const canvasObjects = canvas.getObjects();

  const textObjects = canvasObjects
    .map((obj, canvasObjectIndex) => ({ obj, canvasObjectIndex }))
    .filter(({ obj }) => {
      const type = obj.type?.toLowerCase();
      // Include standard text types and CurvedText
      return type === 'i-text' || type === 'itext' || type === 'text' || type === 'textbox' || type === 'curvedtext' || isCurvedText(obj);
    })
    .map(({ obj, canvasObjectIndex }) => ({
      textObj: obj,
      canvasObjectIndex,
      isCurved: isCurvedText(obj),
    }));

  if (textObjects.length === 0) {
    return {
      svg: '',
      textObjects: [],
      objectSvgs: [],
    };
  }

  // Extract data for each text object
  const textObjectsData: TextObjectData[] = [];
  const objectSvgs: TextObjectSVGExport[] = [];

  textObjects.forEach(({ textObj, canvasObjectIndex, isCurved }, textIndex) => {
    const objectId = getFabricObjectId(textObj) ?? `text-${textIndex}`;
    const printMethod = getFabricObjectPrintMethod(textObj);

    // Get text properties for data storage
    let text: string;
    let fontFamily: string;
    let fontSize: number;
    let fill: string;
    let fontWeight: string;
    let fontStyle: string;
    let textAlign: string;
    let curveIntensity: number | undefined;

    if (isCurved) {
      const curvedObj = textObj as CurvedText;
      text = curvedObj.text || '';
      fontFamily = curvedObj.fontFamily || 'Arial';
      fontSize = curvedObj.fontSize || 16;
      fill = curvedObj.fill?.toString() || '#000000';
      fontWeight = curvedObj.fontWeight?.toString() || 'normal';
      fontStyle = curvedObj.fontStyle || 'normal';
      textAlign = 'center'; // CurvedText is always centered
      curveIntensity = curvedObj.curveIntensity;
    } else {
      const regularTextObj = textObj as fabric.IText;
      text = regularTextObj.text || '';
      fontFamily = regularTextObj.fontFamily || 'Arial';
      fontSize = regularTextObj.fontSize || 16;
      fill = regularTextObj.fill?.toString() || '#000000';
      fontWeight = regularTextObj.fontWeight?.toString() || 'normal';
      fontStyle = regularTextObj.fontStyle || 'normal';
      textAlign = regularTextObj.textAlign || 'left';
    }

    const left = textObj.left || 0;
    const top = textObj.top || 0;
    const angle = textObj.angle || 0;
    const scaleX = textObj.scaleX || 1;
    const scaleY = textObj.scaleY || 1;

    // Store object data
    const textObjectData: TextObjectData = {
      objectId,
      canvasObjectIndex,
      printMethod: printMethod || undefined,
      text,
      fontFamily,
      fontSize,
      fill,
      fontWeight,
      fontStyle,
      textAlign,
      left,
      top,
      angle,
      scaleX,
      scaleY,
      curveIntensity,
      isCurvedText: isCurved,
    };
    textObjectsData.push(textObjectData);

    // Create individual object SVG tightly cropped to object bounds
    // Use toSVG() method for consistent rendering (CurvedText has its own implementation)
    const objectWrapperAttrs =
      ` id="${escapeXml(`text-${objectId}`)}"` +
      ` data-object-id="${escapeXml(objectId)}"` +
      ` data-canvas-index="${canvasObjectIndex}"` +
      (printMethod ? ` data-print-method="${escapeXml(printMethod)}"` : '') +
      (isCurved ? ` data-curved-text="true" data-curve-intensity="${curveIntensity}"` : '');

    const fabricObjectMarkup = textObj.toSVG();
    const wrappedObjectMarkup = `    <g${objectWrapperAttrs}>\n${indentSvgMarkup(
      fabricObjectMarkup,
      '      '
    )}\n    </g>`;

    // Get object bounding box and create tightly-cropped SVG
    // Get the actual bounding box of the object including all transformations
    textObj.setCoords();
    const bbox = textObj.getBoundingRect();

    const bboxWidth = bbox.width > 0 ? bbox.width : fontSize;
    const bboxHeight = bbox.height > 0 ? bbox.height : fontSize;

    // Calculate offset to translate object to top-left of the cropped SVG
    const offsetX = -bbox.left;
    const offsetY = -bbox.top;

    // Create tightly-cropped SVG with object translated to (0,0)
    const perObjectSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${formatSvgNumber(bboxWidth)}"
     height="${formatSvgNumber(bboxHeight)}"
     viewBox="0 0 ${formatSvgNumber(bboxWidth)} ${formatSvgNumber(bboxHeight)}">
  <g transform="translate(${formatSvgNumber(offsetX)}, ${formatSvgNumber(offsetY)})">
${wrappedObjectMarkup}
  </g>
</svg>`;

    objectSvgs.push({
      objectId,
      canvasObjectIndex,
      svg: perObjectSvg,
      svgDataUrl: svgToDataUrl(perObjectSvg),
      textObject: textObjectData,
    });
  });

  return {
    svg: '', // No combined SVG needed - using individual object SVGs only
    textObjects: textObjectsData,
    objectSvgs,
  };
}

/**
 * Extract text objects from canvas and upload as SVG to Supabase
 * @param supabase - Supabase client instance
 * @param canvas - Fabric.js canvas instance
 * @param filename - Optional custom filename
 * @returns SVG export result with upload information
 */
export async function extractAndUploadTextSVG(
  supabase: SupabaseClient,
  canvas: fabric.Canvas,
  filename?: string
): Promise<SVGExportResult> {
  // Extract SVG
  const result = extractTextObjectsToSVG(canvas);

  if (!result.svg) {
    console.warn('No text objects found in canvas');
    return result;
  }

  // Upload to Supabase
  const uploadResult = await uploadSVGToStorage(
    supabase,
    result.svg,
    STORAGE_BUCKETS.TEXT_EXPORTS,
    STORAGE_FOLDERS.SVG,
    filename
  );

  return {
    ...result,
    uploadResult,
  };
}

/**
 * Extract text objects from all canvases and upload as separate SVG files
 * @param supabase - Supabase client instance
 * @param canvasMap - Map of canvas instances by side ID
 * @returns Map of SVG export results by side ID
 */
export async function extractAndUploadAllTextSVG(
  supabase: SupabaseClient,
  canvasMap: Record<string, fabric.Canvas>
): Promise<Record<string, SVGExportResult>> {
  const results: Record<string, SVGExportResult> = {};

  for (const [sideId, canvas] of Object.entries(canvasMap)) {
    const result = await extractAndUploadTextSVG(
      supabase,
      canvas,
      `text-${sideId}`
    );
    results[sideId] = result;
  }

  return results;
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

function svgToDataUrl(svgContent: string): string {
  const encoded = encodeURIComponent(svgContent)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function getFabricObjectId(obj: fabric.FabricObject): string | null {
  // @ts-expect-error - Reading custom data property
  return obj.data?.objectId || obj.data?.id || null;
}

function getFabricObjectPrintMethod(obj: fabric.FabricObject): string | null {
  // @ts-expect-error - Reading custom data property
  return obj.data?.printMethod || null;
}

function indentSvgMarkup(markup: string, indent: string): string {
  return String(markup)
    .split('\n')
    .map(line => (line.length ? `${indent}${line}` : line))
    .join('\n');
}

function formatSvgNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

/**
 * Download SVG content as a file (for testing/debugging)
 */
export function downloadSVG(svgContent: string, filename: string = 'text-export.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
