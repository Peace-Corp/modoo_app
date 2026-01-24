import { ChatMessage, IntentMatch, PricingData, QuickReply, ProductPreview } from './types';
import { NAVIGATION_ROUTES, CATEGORY_MAPPING, PRINT_METHOD_NAMES } from './intents';
import { DEFAULT_PRINT_PRICING } from '@/lib/printPricingConfig';
import { parseKoreanPrice } from './intentMatcher';

type ResponseResult = Omit<ChatMessage, 'id' | 'timestamp'>;

export function generateResponse(
  intentMatch: IntentMatch,
  isAuthenticated: boolean,
  products?: ProductPreview[]
): ResponseResult {
  switch (intentMatch.intent) {
    case 'greeting':
      return generateGreetingResponse();
    case 'navigation':
      return generateNavigationResponse(intentMatch);
    case 'product_recommendation':
      return generateProductResponse(intentMatch, products);
    case 'pricing_info':
      return generatePricingResponse(intentMatch);
    case 'order_status':
      return generateOrderStatusResponse(isAuthenticated);
    case 'faq_help':
      return generateFaqResponse();
    default:
      return generateUnknownResponse();
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

function generateProductResponse(
  intentMatch: IntentMatch,
  products?: ProductPreview[]
): ResponseResult {
  const { maxPrice, category } = intentMatch.extractedEntities;

  // Build description of what we're showing
  let description = '상품을 추천해 드릴게요!';
  if (maxPrice) {
    const price = parseKoreanPrice(maxPrice);
    description = `${price.toLocaleString()}원 이하 상품이에요!`;
  }
  if (category) {
    const categoryName = category;
    description = `${categoryName} 상품을 추천해 드릴게요!`;
  }

  if (products && products.length > 0) {
    return {
      sender: 'bot',
      content: description,
      contentType: 'products',
      metadata: {
        products,
        quickReplies: [
          { label: '더 보기', action: '/home/search', type: 'navigate' },
          { label: '다른 카테고리', action: '다른 상품 추천해줘', type: 'message' }
        ]
      }
    };
  }

  return {
    sender: 'bot',
    content: '조건에 맞는 상품을 찾지 못했어요. 다른 조건으로 검색해 보시겠어요?',
    contentType: 'text',
    metadata: {
      quickReplies: [
        { label: '전체 상품 보기', action: '/home', type: 'navigate' },
        { label: '검색하기', action: '/home/search', type: 'navigate' }
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
    { label: '인쇄 가격', action: '인쇄 가격 알려줘', type: 'message' },
    { label: '주문 조회', action: '주문 상태 확인', type: 'message' },
    { label: 'FAQ', action: '/inquiries?tab=faq', type: 'navigate' },
  ];
}

function formatSizeName(size: string): string {
  if (size === '10x10') return '10cm x 10cm';
  return size;
}
