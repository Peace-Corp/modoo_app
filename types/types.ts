


export interface ProductSide {
  id: string;
  name: string;
  imageUrl: string;
  printArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Real-life dimensions in millimeters
  realLifeDimensions?: {
    printAreaWidthMm: number;   // Real-world width of print area in mm
    printAreaHeightMm: number;  // Real-world height of print area in mm
    productWidthMm: number;     // Real-world width of the entire product mockup in mm
  };
  // Zoom scale for the canvas (1.0 = 100%, 0.5 = 50%, 2.0 = 200%)
  zoomScale?: number;
}

export interface ProductConfig {
  productId: string;
  sides: ProductSide[];
}

export interface SizeOption {
  id: string;
  name: string;
  label: string;
}

export interface CartItem {
  sizeId: string;
  sizeName: string;
  quantity: number;
}

export interface Product {
  id: string;
  title: string;
  base_price: number;
  configuration: ProductSide[];
  size_options?: SizeOption[];
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}