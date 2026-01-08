import * as fabric from 'fabric';
import { PrintMethod, PrintSize } from '@/types/types';
import { countObjectColors } from '@/lib/colorExtractor';
import { getPrintPricingConfig, recommendPrintMethod } from '@/lib/printPricingConfig';

// Size thresholds in mm
const SIZE_THRESHOLDS = {
  '10x10': { maxWidth: 100, maxHeight: 100 },  // 10cm x 10cm
  A4: { maxWidth: 210, maxHeight: 297 },        // A4 size
  A3: { maxWidth: 297, maxHeight: 420 }         // A3 size
} as const;

/**
 * Object-level pricing information
 */
export interface ObjectPricing {
  objectId: string;
  objectType: string;
  printMethod: PrintMethod;
  printSize: PrintSize;
  colorCount: number;
  dimensionsMm: {
    width: number;
    height: number;
  };
  price: number;
  quantity?: number; // For bulk pricing methods
  recommendation?: {
    suggested: boolean;
    reason: string;
  };
}

/**
 * Side-level pricing with object breakdown
 */
export interface SidePricing {
  sideId: string;
  sideName: string;
  objects: ObjectPricing[];
  totalPrice: number;
  hasObjects: boolean;
}

/**
 * Overall pricing summary
 */
export interface PricingSummary {
  sidePricing: SidePricing[];
  totalAdditionalPrice: number;
  totalObjectCount: number;
}

/**
 * Determine print size category based on dimensions in mm
 */
function determinePrintSize(widthMm: number, heightMm: number): PrintSize {
  // Check if it fits within 10x10cm
  if (
    widthMm <= SIZE_THRESHOLDS['10x10'].maxWidth &&
    heightMm <= SIZE_THRESHOLDS['10x10'].maxHeight
  ) {
    return '10x10';
  }

  // Check if it fits within A4
  if (
    widthMm <= SIZE_THRESHOLDS.A4.maxWidth &&
    heightMm <= SIZE_THRESHOLDS.A4.maxHeight
  ) {
    return 'A4';
  }

  // A3 or larger
  return 'A3';
}

/**
 * Calculate price for transfer methods (DTF, DTG)
 * Price is based only on size, not color count
 */
function calculateTransferPrice(
  printMethod: 'dtf' | 'dtg',
  printSize: PrintSize
): number {
  try {
    const config = getPrintPricingConfig();

    if (!config) {
      console.error('Print pricing config is undefined');
      return 0;
    }

    const methodConfig = config[printMethod];

    if (!methodConfig) {
      console.error(`Method config not found for: ${printMethod}`);
      return 0;
    }

    if (!methodConfig.sizes || !methodConfig.sizes[printSize]) {
      console.error(`Size config not found for: ${printSize}`);
      return 0;
    }

    return methodConfig.sizes[printSize];
  } catch (error) {
    console.error('Error calculating transfer price:', error);
    return 0;
  }
}

/**
 * Calculate price for bulk methods (screen printing, embroidery, applique)
 * Price is based on size, color count, and quantity
 */
function calculateBulkPrice(
  printMethod: 'screen_printing' | 'embroidery' | 'applique',
  printSize: PrintSize,
  colorCount: number,
  quantity: number = 1
): number {
  try {
    const config = getPrintPricingConfig();

    if (!config) {
      console.error('Print pricing config is undefined');
      return 0;
    }

    const methodConfig = config[printMethod];

    if (!methodConfig) {
      console.error(`Method config not found for: ${printMethod}`);
      return 0;
    }

    const sizeConfig = methodConfig.sizes[printSize];

    if (!sizeConfig) {
      console.error(`Size config not found for: ${printSize}`);
      return 0;
    }

    // Calculate base price per color
    let pricePerColor: number;

    if (quantity <= sizeConfig.baseQuantity) {
      // For quantities up to baseQuantity (usually 100), use base price
      pricePerColor = sizeConfig.basePrice;
    } else {
      // For quantities over baseQuantity, add additional cost
      const additionalQuantity = quantity - sizeConfig.baseQuantity;
      pricePerColor = sizeConfig.basePrice + (additionalQuantity * sizeConfig.additionalPricePerPiece);
    }

    // Multiply by color count
    return pricePerColor * colorCount;
  } catch (error) {
    console.error('Error calculating bulk price:', error);
    return 0;
  }
}

/**
 * Calculate price for a single object
 */
async function calculateObjectPrice(
  obj: fabric.FabricObject,
  objectId: string,
  widthMm: number,
  heightMm: number,
  printMethod?: PrintMethod,
  quantity: number = 1
): Promise<ObjectPricing> {
  // Determine print size
  const printSize = determinePrintSize(widthMm, heightMm);

  // Count colors in the object
  const colorCount = await countObjectColors(obj);

  // Determine print method if not explicitly set
  let finalPrintMethod = printMethod;
  let recommendation;

  if (!finalPrintMethod) {
    // Auto-select print method
    const recommended = recommendPrintMethod(colorCount, printSize);
    finalPrintMethod = recommended.recommended;
    recommendation = {
      suggested: true,
      reason: recommended.reason
    };
  }

  // Calculate price based on print method
  let price: number;

  if (finalPrintMethod === 'dtf' || finalPrintMethod === 'dtg') {
    price = calculateTransferPrice(finalPrintMethod, printSize);
  } else {
    // screen_printing, embroidery, or applique
    price = calculateBulkPrice(finalPrintMethod, printSize, colorCount, quantity);
  }

  return {
    objectId,
    objectType: obj.type || 'unknown',
    printMethod: finalPrintMethod,
    printSize,
    colorCount,
    dimensionsMm: {
      width: widthMm,
      height: heightMm
    },
    price,
    quantity: finalPrintMethod !== 'dtf' && finalPrintMethod !== 'dtg' ? quantity : undefined,
    recommendation
  };
}

/**
 * Calculate dimensions of an object in mm
 */
function calculateObjectDimensionsMm(
  obj: fabric.FabricObject,
  pixelToMmRatio: number
): { width: number; height: number } {
  const bound = obj.getBoundingRect();
  return {
    width: bound.width * pixelToMmRatio,
    height: bound.height * pixelToMmRatio
  };
}

/**
 * Calculate pricing for a single side with per-object breakdown
 */
export async function calculateSidePricing(
  canvas: fabric.Canvas,
  sideId: string,
  sideName: string,
  imageWidthPixels?: number,
  productWidthMm?: number,
  quantity: number = 1
): Promise<SidePricing> {
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
    return {
      sideId,
      sideName,
      objects: [],
      totalPrice: 0,
      hasObjects: false
    };
  }

  // Get the scaled product image width on the canvas
  // @ts-expect-error - Custom property
  const scaledImageWidth = canvas.scaledImageWidth || imageWidthPixels || 500;

  // Get the real-world product width in mm
  const realWorldProductWidth = productWidthMm || 500; // Default to 500mm

  // Calculate pixel-to-mm ratio
  const pixelToMmRatio = realWorldProductWidth / scaledImageWidth;

  // Calculate pricing for each object
  const objectPricings: ObjectPricing[] = [];

  for (const obj of userObjects) {
    // Get object ID from data or generate one
    // @ts-expect-error - Checking custom data property
    const objectId = obj.data?.objectId || `obj-${Math.random().toString(36).substring(2, 11)}`;

    // Get explicit print method if set
    // @ts-expect-error - Checking custom data property
    const printMethod = obj.data?.printMethod as PrintMethod | undefined;

    // Calculate dimensions in mm
    const { width, height } = calculateObjectDimensionsMm(obj, pixelToMmRatio);

    // Calculate pricing
    const pricing = await calculateObjectPrice(
      obj,
      objectId,
      width,
      height,
      printMethod,
      quantity
    );

    objectPricings.push(pricing);
  }

  // Sum up total price for this side
  const totalPrice = objectPricings.reduce((sum, p) => sum + p.price, 0);

  return {
    sideId,
    sideName,
    objects: objectPricings,
    totalPrice,
    hasObjects: true
  };
}

/**
 * Calculate total pricing for all canvas sides
 */
export async function calculateAllSidesPricing(
  canvasMap: Record<string, fabric.Canvas>,
  sides: Array<{
    id: string;
    name: string;
    realLifeDimensions?: { productWidthMm: number };
  }>,
  quantity: number = 1
): Promise<PricingSummary> {
  const sidePricings: SidePricing[] = [];
  let totalAdditionalPrice = 0;
  let totalObjectCount = 0;

  for (const side of sides) {
    const canvas = canvasMap[side.id];
    if (canvas) {
      // Get the original image width from the canvas
      // @ts-expect-error - Custom property
      const imageWidth = canvas.originalImageWidth;

      const pricing = await calculateSidePricing(
        canvas,
        side.id,
        side.name,
        imageWidth,
        side.realLifeDimensions?.productWidthMm,
        quantity
      );

      sidePricings.push(pricing);
      totalAdditionalPrice += pricing.totalPrice;
      totalObjectCount += pricing.objects.length;
    }
  }

  return {
    sidePricing: sidePricings,
    totalAdditionalPrice,
    totalObjectCount
  };
}
