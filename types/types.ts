


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
  manufacturer_color_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined from manufacturer_colors
  manufacturer_colors: {
    id: string;
    name: string;
    hex: string;
    color_code: string;
  };
}

// Discount tier for quantity-based pricing
export interface DiscountTier {
  min_quantity: number;
  discount_rate: number; // Percentage (e.g., 5 means 5%)
}

export interface Product {
  id: string;
  title: string;
  base_price: number;
  configuration: ProductSide[];
  size_options?: SizeOption[];
  discount_rates?: DiscountTier[]; // Quantity-based discount tiers
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_image_link?: string;
  description_image?: string | null;
  sizing_chart_image?: string | null;
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
  // bg_color: string;
  bg_image: string | null;
  image_link: string | null;
  redirect_link: string | null;
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
  replies?: (InquiryReply & { admin?: { name: string } })[];
  user?: { name: string };
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  tags: string[];
  sort_order: number;
  is_published: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Print option types
export type PrintMethod = 'dtf' | 'dtg' | 'screen_printing' | 'embroidery' | 'applique';

export interface PrintOption {
  method: PrintMethod;
  price: number; // Additional cost for this print method
}

// Size categories for printing
export type PrintSize = '10x10' | 'A4' | 'A3';

// Pricing configuration for different print methods
export interface TransferPricing {
  method: 'dtf' | 'dtg';
  sizes: {
    '10x10': number;
    A4: number;
    A3: number;
  };
}

export interface BulkPricing {
  method: 'screen_printing' | 'embroidery' | 'applique';
  sizes: {
    '10x10': {
      basePrice: number; // Price for first 100 pieces
      baseQuantity: number; // Usually 100
      additionalPricePerPiece: number; // Price per piece after baseQuantity
    };
    A4: {
      basePrice: number;
      baseQuantity: number;
      additionalPricePerPiece: number;
    };
    A3: {
      basePrice: number;
      baseQuantity: number;
      additionalPricePerPiece: number;
    };
  };
}

export interface PrintPricingConfig {
  dtf: TransferPricing;
  dtg: TransferPricing;
  screen_printing: BulkPricing;
  embroidery: BulkPricing;
  applique: BulkPricing;
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

// Order item SVG export types (server-generated during checkout)
export type TextSvgObjectExports = Record<string, Record<string, string>>;

export interface TextSvgExports {
  __objects?: TextSvgObjectExports; // sideId -> objectId -> url
  [sideId: string]: string | TextSvgObjectExports | undefined; // sideId -> combined SVG url
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

// Design Template - Admin-managed pre-made designs for products
export interface DesignTemplate {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  canvas_state: Record<string, string>; // sideId -> JSON string of canvas objects
  preview_url: string | null;
  layer_colors: Record<string, Record<string, string>>; // sideId -> layerId -> hex color
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Lightweight type for template picker display
export interface TemplatePickerItem {
  id: string;
  title: string;
  description: string | null;
  preview_url: string | null;
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
  text_svg_exports: TextSvgExports | null;
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

// Pricing tier for quantity-based discounts
export interface CoBuyPricingTier {
  minQuantity: number;
  pricePerItem: number;
}

// Selected item with size and quantity
export interface CoBuySelectedItem {
  size: string;
  quantity: number;
}

// Delivery method options
export type CoBuyDeliveryMethod = 'pickup' | 'delivery';

// Pickup status for tracking distribution (배부 기능)
export type CoBuyPickupStatus = 'pending' | 'picked_up'; // 미수령 | 수령

// Delivery address info for participants who choose delivery
export interface CoBuyDeliveryInfo {
  recipientName: string;
  phone: string;
  address: string;
  addressDetail: string; // 상세주소
  postalCode: string;
  memo?: string; // 배송 요청사항
}

// Address information for CoBuy delivery settings
export interface CoBuyAddressInfo {
  roadAddress: string; // 도로명 주소
  jibunAddress?: string; // 지번 주소
  postalCode: string; // 우편번호
  addressDetail?: string; // 상세주소
}

// Delivery settings configured by session creator
export interface CoBuyDeliverySettings {
  enabled: boolean; // Whether delivery option is available
  deliveryFee: number; // Extra fee for delivery (0 if free)
  pickupLocation?: string; // Optional pickup location description (legacy, for display)
  deliveryAddress?: CoBuyAddressInfo; // 배송받을 장소 - where organizer receives products
  pickupAddress?: CoBuyAddressInfo; // 배부 장소 - where participants pick up orders
}

export type CoBuyStatus =
  | 'gathering'           // 모집중
  | 'gather_complete'     // 모집 완료
  | 'order_complete'      // 주문 완료
  | 'manufacturing'       // 제작중
  | 'manufacture_complete' // 제작 완료
  | 'delivering'          // 배송중
  | 'delivery_complete'   // 배송 완료
  | 'cancelled';          // 취소됨

export interface CoBuySession {
  id: string;
  user_id: string;
  saved_design_screenshot_id: string;
  title: string;
  description: string | null;
  status: CoBuyStatus;
  share_token: string;
  start_date: string;
  end_date: string;
  receive_by_date: string | null; // Date when items need to be received by (can be after end_date)
  min_quantity: number | null; // Minimum total quantity to proceed
  max_quantity: number | null; // Maximum total quantity (optional cap)
  max_participants: number | null; // Max number of participants (legacy, optional)
  current_participant_count: number;
  current_total_quantity: number; // Total items ordered so far
  pricing_tiers: CoBuyPricingTier[]; // Quantity-based pricing tiers
  custom_fields: CoBuyCustomField[];
  delivery_settings: CoBuyDeliverySettings | null; // Delivery configuration
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
  selected_size: string; // Legacy - kept for backward compatibility
  selected_items: CoBuySelectedItem[]; // New - supports multiple sizes with quantities
  total_quantity: number; // Total items this participant ordered
  delivery_method: CoBuyDeliveryMethod | null; // 'pickup' or 'delivery'
  delivery_info: CoBuyDeliveryInfo | null; // Address info if delivery method is 'delivery'
  delivery_fee: number; // Fee paid for delivery (0 for pickup)
  pickup_status: CoBuyPickupStatus; // 수령 상태 for pickup participants (배부 기능)
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
