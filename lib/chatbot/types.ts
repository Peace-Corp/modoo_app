// Message sender types
export type MessageSender = 'user' | 'bot';

// Message content types for rich responses
export type MessageContentType =
  | 'text'
  | 'products'
  | 'pricing'
  | 'navigation'
  | 'quick_replies'
  | 'login_prompt';

// Quick reply button
export interface QuickReply {
  label: string;
  action: string;
  type: 'message' | 'navigate';
}

// Lightweight product for chat display
export interface ProductPreview {
  id: string;
  title: string;
  base_price: number;
  thumbnail_image_link: string | null;
  category: string | null;
}

// Pricing data structure
export interface PricingData {
  method: string;
  methodKorean: string;
  sizes: {
    size: string;
    price: string;
    note?: string;
  }[];
}

// Single chat message
export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  contentType: MessageContentType;
  timestamp: number;
  metadata?: {
    products?: ProductPreview[];
    pricingData?: PricingData;
    navigationRoute?: string;
    quickReplies?: QuickReply[];
  };
}

// Supported chat intents
export type ChatIntent =
  | 'navigation'
  | 'product_recommendation'
  | 'pricing_info'
  | 'order_status'
  | 'faq_help'
  | 'greeting'
  | 'reset'
  | 'cobuy_info'
  | 'unknown';

// Product recommendation conversation steps
export type RecommendationStep =
  | 'initial'
  | 'category'
  | 'budget'
  | 'purpose'
  | 'quantity'
  | 'complete';

// Product recommendation preferences collected during conversation
export interface RecommendationPreferences {
  category?: string;
  maxPrice?: number;
  purpose?: string;
  quantity?: string;
}

// Conversation state for multi-step flows
export interface ConversationState {
  activeFlow: 'product_recommendation' | null;
  currentStep: RecommendationStep;
  preferences: RecommendationPreferences;
}

// Intent matching result
export interface IntentMatch {
  intent: ChatIntent;
  confidence: number;
  extractedEntities: Record<string, string>;
}

// Intent definition for matching
export interface IntentDefinition {
  intent: ChatIntent;
  keywords: string[];
  patterns: RegExp[];
  entityExtractors?: {
    name: string;
    pattern: RegExp;
  }[];
}
