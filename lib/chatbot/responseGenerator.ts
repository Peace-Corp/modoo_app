import { ChatMessage, IntentMatch, PricingData, QuickReply, ProductPreview, RecommendationStep, RecommendationPreferences } from './types';
import { NAVIGATION_ROUTES, CATEGORY_MAPPING, PRINT_METHOD_NAMES } from './intents';
import { DEFAULT_PRINT_PRICING } from '@/lib/printPricingConfig';
import { parseKoreanPrice } from './intentMatcher';

type ResponseResult = Omit<ChatMessage, 'id' | 'timestamp'>;

// Response result with conversation state updates
export interface ResponseWithState {
  response: ResponseResult;
  stateUpdate?: {
    startFlow?: boolean;
    nextStep?: RecommendationStep;
    preferences?: Record<string, string | number>;
    resetFlow?: boolean;
  };
}

export function generateResponse(
  intentMatch: IntentMatch,
  isAuthenticated: boolean,
  products?: ProductPreview[],
  conversationState?: { currentStep: RecommendationStep; preferences: RecommendationPreferences }
): ResponseWithState | 'reset' {
  // Handle active recommendation flow
  if (conversationState?.currentStep && conversationState.currentStep !== 'initial') {
    return handleRecommendationFlow(intentMatch, conversationState, products);
  }

  switch (intentMatch.intent) {
    case 'greeting':
      return { response: generateGreetingResponse() };
    case 'navigation':
      return { response: generateNavigationResponse(intentMatch) };
    case 'product_recommendation':
      return generateProductRecommendationStart(intentMatch, products);
    case 'pricing_info':
      return { response: generatePricingResponse(intentMatch) };
    case 'order_status':
      return { response: generateOrderStatusResponse(isAuthenticated) };
    case 'faq_help':
      return { response: generateFaqResponse() };
    case 'cobuy_info':
      return { response: generateCoBuyResponse() };
    case 'reset':
      return 'reset';
    default:
      return { response: generateUnknownResponse() };
  }
}

function generateGreetingResponse(): ResponseResult {
  return {
    sender: 'bot',
    content: '안녕하세요! 무엇을 도와드릴까요?',
    contentType: 'text',
    metadata: {
      quickReplies: getDefaultQuickReplies()
    }
  };
}

function generateNavigationResponse(intentMatch: IntentMatch): ResponseResult {
  const destination = intentMatch.extractedEntities.destination;
  const route = destination ? NAVIGATION_ROUTES[destination] : null;

  if (route) {
    return {
      sender: 'bot',
      content: `${destination} 페이지로 이동할게요!`,
      contentType: 'navigation',
      metadata: {
        navigationRoute: route,
        quickReplies: [
          { label: '이동하기', action: route, type: 'navigate' },
          { label: '다른 도움', action: '도움말', type: 'message' }
        ]
      }
    };
  }

  // Couldn't determine destination
  return {
    sender: 'bot',
    content: '어디로 이동하시겠어요?',
    contentType: 'text',
    metadata: {
      quickReplies: [
        { label: '홈', action: '/home', type: 'navigate' },
        { label: '장바구니', action: '/cart', type: 'navigate' },
        { label: '마이페이지', action: '/home/my-page', type: 'navigate' },
        { label: '내 디자인', action: '/home/designs', type: 'navigate' },
      ]
    }
  };
}

// Start the product recommendation flow with questions
function generateProductRecommendationStart(
  intentMatch: IntentMatch,
  products?: ProductPreview[]
): ResponseWithState {
  const { maxPrice, category } = intentMatch.extractedEntities;

  // If user already provided specific criteria, show results directly
  if (maxPrice || category) {
    let description = '상품을 추천해 드릴게요!';
    if (maxPrice) {
      const price = parseKoreanPrice(maxPrice);
      description = `${price.toLocaleString()}원 이하 상품이에요!`;
    }
    if (category) {
      description = `${category} 상품을 추천해 드릴게요!`;
    }

    if (products && products.length > 0) {
      return {
        response: {
          sender: 'bot',
          content: description,
          contentType: 'products',
          metadata: {
            products,
            quickReplies: [
              { label: '더 보기', action: '/home/search', type: 'navigate' },
              { label: '다른 조건으로 추천', action: '다른 상품 추천해줘', type: 'message' },
              { label: '공동구매 알아보기', action: '공동구매가 뭐야?', type: 'message' }
            ]
          }
        }
      };
    }
  }

  // Start the multi-step recommendation flow
  return {
    response: {
      sender: 'bot',
      content: '맞춤 상품을 추천해 드릴게요! 먼저 어떤 종류의 의류를 찾으시나요?',
      contentType: 'text',
      metadata: {
        quickReplies: [
          { label: '티셔츠', action: '티셔츠', type: 'message' },
          { label: '후드티', action: '후드티', type: 'message' },
          { label: '맨투맨', action: '맨투맨', type: 'message' },
          { label: '후드집업', action: '후드집업', type: 'message' },
          { label: '자켓', action: '자켓', type: 'message' },
          { label: '상관없음', action: '상관없음', type: 'message' }
        ]
      }
    },
    stateUpdate: {
      startFlow: true,
      nextStep: 'category'
    }
  };
}

// Handle ongoing recommendation flow based on current step
function handleRecommendationFlow(
  intentMatch: IntentMatch,
  conversationState: { currentStep: RecommendationStep; preferences: RecommendationPreferences },
  products?: ProductPreview[]
): ResponseWithState {
  const userInput = intentMatch.extractedEntities.category ||
                    intentMatch.extractedEntities.maxPrice ||
                    Object.values(intentMatch.extractedEntities)[0] || '';

  switch (conversationState.currentStep) {
    case 'category':
      return handleCategoryStep(userInput);
    case 'budget':
      return handleBudgetStep(userInput);
    case 'purpose':
      return handlePurposeStep(userInput);
    case 'quantity':
      return handleQuantityStep(userInput, conversationState.preferences, products);
    default:
      return {
        response: generateUnknownResponse(),
        stateUpdate: { resetFlow: true }
      };
  }
}

function handleCategoryStep(userInput: string): ResponseWithState {
  const categoryMap: Record<string, string> = {
    '티셔츠': '티셔츠',
    '후드티': '후드티',
    '맨투맨': '맨투맨',
    '후드집업': '후드집업',
    '자켓': '자켓',
    '상관없음': ''
  };

  const category = categoryMap[userInput] ?? '';

  return {
    response: {
      sender: 'bot',
      content: category ? `${category}! 좋은 선택이에요. 예산은 어느 정도로 생각하시나요?` : '알겠어요! 예산은 어느 정도로 생각하시나요?',
      contentType: 'text',
      metadata: {
        quickReplies: [
          { label: '1만원 이하', action: '1만원', type: 'message' },
          { label: '2만원 이하', action: '2만원', type: 'message' },
          { label: '3만원 이하', action: '3만원', type: 'message' },
          { label: '5만원 이하', action: '5만원', type: 'message' },
          { label: '상관없음', action: '상관없음', type: 'message' }
        ]
      }
    },
    stateUpdate: {
      nextStep: 'budget',
      preferences: { category }
    }
  };
}

function handleBudgetStep(userInput: string): ResponseWithState {
  const priceMatch = userInput.match(/(\d+)/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1]) * 10000 : undefined;

  return {
    response: {
      sender: 'bot',
      content: '어떤 용도로 사용하실 예정인가요?',
      contentType: 'text',
      metadata: {
        quickReplies: [
          { label: '단체복/유니폼', action: '단체복', type: 'message' },
          { label: '행사/이벤트', action: '행사용', type: 'message' },
          { label: '동아리/동호회', action: '동아리', type: 'message' },
          { label: '일상/캐주얼', action: '일상용', type: 'message' },
          { label: '기타', action: '기타', type: 'message' }
        ]
      }
    },
    stateUpdate: {
      nextStep: 'purpose',
      preferences: maxPrice ? { maxPrice } : {}
    }
  };
}

function handlePurposeStep(userInput: string): ResponseWithState {
  const purpose = userInput;

  return {
    response: {
      sender: 'bot',
      content: '대략 몇 장 정도 필요하신가요?',
      contentType: 'text',
      metadata: {
        quickReplies: [
          { label: '10장 미만', action: '소량', type: 'message' },
          { label: '10~30장', action: '중량', type: 'message' },
          { label: '30~100장', action: '대량', type: 'message' },
          { label: '100장 이상', action: '대량주문', type: 'message' }
        ]
      }
    },
    stateUpdate: {
      nextStep: 'quantity',
      preferences: { purpose }
    }
  };
}

function handleQuantityStep(
  userInput: string,
  preferences: RecommendationPreferences,
  products?: ProductPreview[]
): ResponseWithState {
  const quantity = userInput;
  const isLargeOrder = quantity === '대량' || quantity === '대량주문';

  // Build description based on collected preferences
  let description = '고객님께 맞는 상품을 추천해 드릴게요!';
  if (preferences.category) {
    description = `${preferences.category} 상품을 추천해 드릴게요!`;
  }
  if (preferences.maxPrice) {
    description += ` (${(preferences.maxPrice / 10000).toLocaleString()}만원 이하)`;
  }

  if (products && products.length > 0) {
    const quickReplies: QuickReply[] = [
      { label: '더 보기', action: '/home/search', type: 'navigate' },
      { label: '다른 조건으로 추천', action: '다른 상품 추천해줘', type: 'message' }
    ];

    // Suggest CoBuy for large orders
    if (isLargeOrder) {
      quickReplies.push({ label: '공동구매 알아보기', action: '공동구매가 뭐야?', type: 'message' });
    }

    return {
      response: {
        sender: 'bot',
        content: isLargeOrder
          ? `${description}\n\n💡 대량 주문이시라면 공동구매를 통해 더 저렴하게 구매하실 수 있어요!`
          : description,
        contentType: 'products',
        metadata: {
          products,
          quickReplies
        }
      },
      stateUpdate: {
        resetFlow: true,
        preferences: { quantity }
      }
    };
  }

  return {
    response: {
      sender: 'bot',
      content: '조건에 맞는 상품을 찾지 못했어요. 다른 조건으로 검색해 보시겠어요?',
      contentType: 'text',
      metadata: {
        quickReplies: [
          { label: '전체 상품 보기', action: '/home', type: 'navigate' },
          { label: '다시 추천받기', action: '상품 추천해줘', type: 'message' }
        ]
      }
    },
    stateUpdate: { resetFlow: true }
  };
}

// CoBuy explanation response
function generateCoBuyResponse(): ResponseResult {
  return {
    sender: 'bot',
    content: `공동구매(CoBuy)란? 🛒

여러 고객이 함께 주문하여 대량 할인 혜택을 받는 서비스예요!

[공동구매 시작하는 방법]
1. 상품을 선택하고 디자인한다
2. 구매하기를 누른다
3. 공동구매를 선택한다

[장점]
- 소량 주문도 대량 구매 가격으로!
- 최소 수량 부담 없이 참여 가능
- 같은 디자인을 원하는 분들과 함께 구매

공동구매 페이지에서 진행 중인 공구를 확인하거나, 직접 공구를 개설할 수도 있어요.`,
    contentType: 'text',
    metadata: {
      quickReplies: [
        { label: '상품 추천받기', action: '상품 추천해줘', type: 'message' },
        { label: '다른 도움', action: '도움말', type: 'message' }
      ]
    }
  };
}

function generatePricingResponse(intentMatch: IntentMatch): ResponseResult {
  const { printMethod } = intentMatch.extractedEntities;

  // Map Korean method name to key
  const methodMapping: Record<string, string> = {
    'dtf': 'dtf',
    'DTF': 'dtf',
    'dtg': 'dtg',
    'DTG': 'dtg',
    '나염': 'screen_printing',
    '자수': 'embroidery',
    '아플리케': 'applique',
    '전사': 'dtf', // Default 전사 to DTF
  };

  const methodKey = printMethod ? methodMapping[printMethod] || 'dtf' : null;

  // Show specific method pricing
  if (methodKey && DEFAULT_PRINT_PRICING[methodKey as keyof typeof DEFAULT_PRINT_PRICING]) {
    const pricing = DEFAULT_PRINT_PRICING[methodKey as keyof typeof DEFAULT_PRINT_PRICING];
    const methodName = PRINT_METHOD_NAMES[methodKey] || methodKey.toUpperCase();

    const pricingData: PricingData = {
      method: methodKey,
      methodKorean: methodName,
      sizes: []
    };

    // Build size pricing array
    for (const [size, value] of Object.entries(pricing.sizes)) {
      if (typeof value === 'number') {
        pricingData.sizes.push({
          size: formatSizeName(size),
          price: `${value.toLocaleString()}원`
        });
      } else {
        // Complex pricing (screen printing, embroidery, applique)
        const complexValue = value as { basePrice: number; baseQuantity: number; additionalPricePerPiece: number };
        pricingData.sizes.push({
          size: formatSizeName(size),
          price: `${complexValue.basePrice.toLocaleString()}원`,
          note: `(${complexValue.baseQuantity}장 기준, 추가 ${complexValue.additionalPricePerPiece.toLocaleString()}원/장)`
        });
      }
    }

    return {
      sender: 'bot',
      content: `${methodName} 가격 안내드려요!`,
      contentType: 'pricing',
      metadata: {
        pricingData,
        quickReplies: [
          { label: '다른 인쇄 방법', action: '다른 인쇄 가격', type: 'message' },
          { label: '상품 보기', action: '/home', type: 'navigate' }
        ]
      }
    };
  }

  // Show all methods overview
  return {
    sender: 'bot',
    content: '어떤 인쇄 방법의 가격을 확인하시겠어요?',
    contentType: 'text',
    metadata: {
      quickReplies: [
        { label: 'DTF 전사', action: 'DTF 가격', type: 'message' },
        { label: 'DTG 전사', action: 'DTG 가격', type: 'message' },
        { label: '나염', action: '나염 가격', type: 'message' },
        { label: '자수', action: '자수 가격', type: 'message' },
      ]
    }
  };
}

function generateOrderStatusResponse(isAuthenticated: boolean): ResponseResult {
  if (!isAuthenticated) {
    return {
      sender: 'bot',
      content: '주문 내역을 확인하려면 로그인이 필요해요.',
      contentType: 'login_prompt',
      metadata: {
        quickReplies: [
          { label: '로그인하기', action: '/login', type: 'navigate' },
          { label: '다른 도움', action: '도움말', type: 'message' }
        ]
      }
    };
  }

  return {
    sender: 'bot',
    content: '주문 내역 페이지로 이동할게요!',
    contentType: 'navigation',
    metadata: {
      navigationRoute: '/home/my-page/orders',
      quickReplies: [
        { label: '주문 내역 보기', action: '/home/my-page/orders', type: 'navigate' },
        { label: '다른 도움', action: '도움말', type: 'message' }
      ]
    }
  };
}

function generateFaqResponse(): ResponseResult {
  return {
    sender: 'bot',
    content: '자주 묻는 질문을 확인하시거나 문의를 남겨주세요!',
    contentType: 'text',
    metadata: {
      quickReplies: [
        { label: 'FAQ 보기', action: '/inquiries?tab=faq', type: 'navigate' },
        { label: '문의하기', action: '/inquiries/new', type: 'navigate' },
        { label: '고객센터', action: '/inquiries', type: 'navigate' }
      ]
    }
  };
}

function generateUnknownResponse(): ResponseResult {
  return {
    sender: 'bot',
    content: '죄송해요, 잘 이해하지 못했어요. 아래 옵션 중에서 선택해 주세요!',
    contentType: 'text',
    metadata: {
      quickReplies: getDefaultQuickReplies()
    }
  };
}

function getDefaultQuickReplies(): QuickReply[] {
  return [
    { label: '상품 추천', action: '상품 추천해줘', type: 'message' },
    { label: '공동구매란?', action: '공동구매가 뭐야?', type: 'message' },
    { label: '인쇄 가격', action: '인쇄 가격 알려줘', type: 'message' },
    { label: 'FAQ', action: '/inquiries?tab=faq', type: 'navigate' },
  ];
}

function formatSizeName(size: string): string {
  if (size === '10x10') return '10cm x 10cm';
  return size;
}
