import * as fabric from 'fabric';

// A6 size in mm: 105 x 148
// A5 size in mm: 148 x 210
// A4 size in mm: 210 x 297

const SIZE_CATEGORIES = {
  A6: { maxWidth: 105, maxHeight: 148, price: 5000 },
  A5: { maxWidth: 148, maxHeight: 210, price: 6000 },
  A4: { maxWidth: 210, maxHeight: 297, price: 7000 },
  LARGER: { price: 8000 }
} as const;

export interface SidePricing {
  sideId: string;
  sideName: string;
  additionalPrice: number;
  hasObjects: boolean;
  boundingBox?: {
    width: number;
    height: number;
  };
}

/**
 * Calculate the bounding box of all user objects on a canvas
 * Excludes background images, guides, and snap lines
 */
function calculateObjectsBoundingBox(canvas: fabric.Canvas): { width: number; height: number } | null {
  // Filter user-added objects only
  const userObjects = canvas.getObjects().filter(obj => {
    // Exclude guide boxes and snap lines
    if (obj.excludeFromExport) return false;

    // Exclude the background product image
    // @ts-expect-error - Checking custom data property
    if (obj.data?.id === 'background-product-image') return false;

    return true;
  });

  if (userObjects.length === 0) {
    return null;
  }

  // Calculate the bounding box that encompasses all objects
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  userObjects.forEach(obj => {
    const bound = obj.getBoundingRect();
    minX = Math.min(minX, bound.left);
    minY = Math.min(minY, bound.top);
    maxX = Math.max(maxX, bound.left + bound.width);
    maxY = Math.max(maxY, bound.top + bound.height);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  return { width, height };
}

/**
 * Convert canvas pixels to mm based on print area dimensions
 * Uses the real-life dimensions from product data for accurate conversion
 */
function pixelsToMm(pixels: number, canvasPrintAreaWidth: number, realWorldPrintAreaWidth: number): number {
  const mmPerPixel = realWorldPrintAreaWidth / canvasPrintAreaWidth;
  return pixels * mmPerPixel;
}

/**
 * Determine the pricing category based on dimensions in mm
 */
function getPricingCategory(widthMm: number, heightMm: number): number {
  // Check if it fits within A6 (smallest)
  if (widthMm <= SIZE_CATEGORIES.A6.maxWidth && heightMm <= SIZE_CATEGORIES.A6.maxHeight) {
    return SIZE_CATEGORIES.A6.price;
  }

  // Check if it fits within A5
  if (widthMm <= SIZE_CATEGORIES.A5.maxWidth && heightMm <= SIZE_CATEGORIES.A5.maxHeight) {
    return SIZE_CATEGORIES.A5.price;
  }

  // Check if it fits within A4
  if (widthMm <= SIZE_CATEGORIES.A4.maxWidth && heightMm <= SIZE_CATEGORIES.A4.maxHeight) {
    return SIZE_CATEGORIES.A4.price;
  }

  // Larger than A4
  return SIZE_CATEGORIES.LARGER.price;
}

/**
 * Calculate pricing for a single canvas side
 */
export function calculateSidePricing(
  canvas: fabric.Canvas,
  sideId: string,
  sideName: string,
  printAreaWidthPixels?: number,
  printAreaWidthMm?: number
): SidePricing {
  const boundingBox = calculateObjectsBoundingBox(canvas);

  if (!boundingBox) {
    return {
      sideId,
      sideName,
      additionalPrice: 0,
      hasObjects: false
    };
  }

  // Get print area dimensions for conversion
  // @ts-expect-error - Custom property
  const canvasPrintAreaWidth = canvas.printAreaWidth || printAreaWidthPixels || 300;
  const realWorldPrintAreaWidth = printAreaWidthMm || 250; // Default to 250mm for t-shirts

  // Convert pixels to mm using real-life dimensions
  const widthMm = pixelsToMm(boundingBox.width, canvasPrintAreaWidth, realWorldPrintAreaWidth);
  const heightMm = pixelsToMm(boundingBox.height, canvasPrintAreaWidth, realWorldPrintAreaWidth);

  const additionalPrice = getPricingCategory(widthMm, heightMm);

  return {
    sideId,
    sideName,
    additionalPrice,
    hasObjects: true,
    boundingBox: {
      width: widthMm,
      height: heightMm
    }
  };
}

/**
 * Calculate total pricing for all canvas sides
 */
export function calculateAllSidesPricing(
  canvasMap: Record<string, fabric.Canvas>,
  sides: Array<{
    id: string;
    name: string;
    printArea?: { width: number };
    realLifeDimensions?: { printAreaWidthMm: number };
  }>
): {
  sidePricing: SidePricing[];
  totalAdditionalPrice: number;
} {
  const sidePricing: SidePricing[] = [];
  let totalAdditionalPrice = 0;

  sides.forEach(side => {
    const canvas = canvasMap[side.id];
    if (canvas) {
      const pricing = calculateSidePricing(
        canvas,
        side.id,
        side.name,
        side.printArea?.width,
        side.realLifeDimensions?.printAreaWidthMm
      );
      sidePricing.push(pricing);
      totalAdditionalPrice += pricing.additionalPrice;
    }
  });

  return {
    sidePricing,
    totalAdditionalPrice
  };
}