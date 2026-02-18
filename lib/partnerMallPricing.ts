import { ProductSide, PrintSize, LogoPlacement } from '@/types/types';
import { getPrintPricingConfig } from './printPricingConfig';

/**
 * Determine print size category based on dimensions in mm
 */
function determinePrintSize(widthMm: number, heightMm: number): PrintSize {
  if (widthMm <= 100 && heightMm <= 100) return '10x10';
  if (widthMm <= 210 && heightMm <= 297) return 'A4';
  return 'A3';
}

/**
 * Calculate the additional printing cost for a partner mall product's logo
 * based on logo placement dimensions and DTF pricing.
 *
 * Logo placements store dimensions in original image pixels.
 * We convert to mm using the product's realLifeDimensions and printArea.
 */
export function calculateLogoAdditionalPrice(
  configuration: ProductSide[],
  logoPlacements: Record<string, LogoPlacement>
): number {
  if (!logoPlacements || !configuration) return 0;

  const config = getPrintPricingConfig();
  let totalAdditional = 0;

  for (const side of configuration) {
    const placement = logoPlacements[side.id];
    if (!placement || !placement.width || !placement.height) continue;

    const realDims = side.realLifeDimensions;
    if (!realDims || !side.printArea.width || !side.printArea.height) continue;

    // Convert logo pixel dimensions to mm
    const mmPerPixelW = realDims.printAreaWidthMm / side.printArea.width;
    const mmPerPixelH = realDims.printAreaHeightMm / side.printArea.height;
    const logoWidthMm = placement.width * mmPerPixelW;
    const logoHeightMm = placement.height * mmPerPixelH;

    const printSize = determinePrintSize(logoWidthMm, logoHeightMm);

    // Logo is always an image -> use DTF pricing
    const dtfPrice = config.dtf.sizes[printSize] as number;
    if (dtfPrice) {
      totalAdditional += dtfPrice;
    }
  }

  return totalAdditional;
}
