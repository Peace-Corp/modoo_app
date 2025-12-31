


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

export interface ProductColor {
  id: string;
  product_id: string;
  color_id: string;
  name: string;
  hex: string;
  label?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

export interface ProductionExample {
  id: string;
  product_id: string;
  title: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InquiryStatus = 'pending' | 'ongoing' | 'completed';

export interface Inquiry {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface InquiryProduct {
  id: string;
  inquiry_id: string;
  product_id: string;
  created_at: string;
}

export interface InquiryReply {
  id: string;
  inquiry_id: string;
  admin_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface InquiryWithDetails extends Inquiry {
  products?: (InquiryProduct & { product: Product })[];
  replies?: (InquiryReply & { admin?: { email: string } })[];
  user?: { email: string };
}