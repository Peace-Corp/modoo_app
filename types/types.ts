


export interface ColorOption {
  hex: string;
  colorCode: string;
}

export interface ProductLayer {
  id: string;
  name: string;
  imageUrl: string;
  zIndex: number;
  colorOptions: ColorOption[]; // Array of color options with hex and colorCode
}

export interface ProductSide {
  id: string;
  name: string;
  imageUrl?: string; // Optional for backward compatibility
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
  // Multi-layer support
  layers?: ProductLayer[];
  // Color options for single-layered mode (when layers is not used)
  colorOptions?: ColorOption[];
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
  thumbnail_image_link?: string;
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

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  bg_color: string;
  bg_image: string | null;
  bg_position: string | null;
  is_active: boolean;
  sort_order: number;
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

// Print option types
export type PrintMethod = 'embroidery' | 'printing';

export interface PrintOption {
  method: PrintMethod;
  price: number; // Additional cost for this print method
}

export interface CanvasObjectPrintData {
  printMethod?: PrintMethod;
  // Additional metadata for pricing and production
  estimatedCost?: number;
}

// Supabase storage metadata for canvas objects
export interface CanvasObjectStorageData {
  supabaseUrl?: string;
  supabasePath?: string;
  uploadedAt?: string;
}

// Combined canvas object data type
export interface CanvasObjectData extends CanvasObjectPrintData, CanvasObjectStorageData {
  id?: string;
  objectId?: string;
  [key: string]: unknown; // Allow additional custom properties
}

// Database types
export interface SavedDesign {
  id: string;
  user_id: string;
  product_id: string;
  title: string;
  color_selections: Record<string, unknown>;
  canvas_state: Record<string, unknown>;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  price_per_item: number;
  image_urls: Record<string, unknown>;
}

export interface SavedDesignScreenshot {
  id: string;
  user_id: string;
  product_id: string;
  title: string;
  color_selections: Record<string, unknown>;
  canvas_state: Record<string, unknown>;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  price_per_item: number;
  image_urls: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  price_per_item: number;
  design_id: string | null;
  design_title: string | null;
  product_variant_id: string | null;
  canvas_state: Record<string, unknown>;
  color_selections: Record<string, unknown>;
  item_options: {
    variants: Array<{
      size_id: string;
      size_name: string;
      color_id: string;
      color_name: string;
      color_hex: string;
      quantity: number;
    }>;
  };
  thumbnail_url: string | null;
  text_svg_exports: Record<string, string> | null;
  image_urls: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CoBuy (공동구매) Types
// ============================================================================

export interface CoBuyCustomField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'dropdown';
  label: string;
  required: boolean;
  fixed?: boolean; // True for size dropdown (cannot be removed)
  options?: string[]; // For dropdown type
}

export interface CoBuySession {
  id: string;
  user_id: string;
  saved_design_screenshot_id: string;
  title: string;
  description: string | null;
  status: 'open' | 'closed' | 'cancelled' | 'finalized';
  share_token: string;
  start_date: string;
  end_date: string;
  max_participants: number | null;
  current_participant_count: number;
  custom_fields: CoBuyCustomField[];
  bulk_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoBuyParticipant {
  id: string;
  cobuy_session_id: string;
  name: string;
  email: string;
  phone: string | null;
  field_responses: Record<string, string>;
  selected_size: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_key: string | null;
  payment_amount: number | null;
  paid_at: string | null;
  joined_at: string;
}

export interface CoBuyNotification {
  id: string;
  cobuy_session_id: string;
  participant_id: string | null;
  notification_type: 'participant_joined' | 'session_closing' | 'session_closed' | 'payment_confirmed';
  recipient_email: string;
  sent_at: string;
  metadata: Record<string, unknown> | null;
}

// CoBuy session with related data (for detail views)
export interface CoBuySessionWithDetails extends CoBuySession {
  saved_design_screenshot?: SavedDesignScreenshot;
  participants?: CoBuyParticipant[];
}
