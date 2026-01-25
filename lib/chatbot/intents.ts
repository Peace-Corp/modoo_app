import { IntentDefinition } from './types';

export const INTENT_DEFINITIONS: IntentDefinition[] = [
  // Navigation Intent
  {
    intent: 'navigation',
    keywords: [
      '이동', '가기', '보기', '열기', '페이지',
      '장바구니', '카트', '홈', '검색', '마이페이지',
      '주문내역', '결제', '디자인', '에디터'
    ],
    patterns: [
      /(?:장바구니|카트)(?:로)?\s*(?:이동|가기|보기)?/i,
      /(?:홈|메인|홈페이지)(?:로)?\s*(?:이동|가기)?/i,
      /(?:검색|찾기)(?:페이지)?(?:로)?\s*(?:이동|가기)?/i,
      /(?:마이페이지|내정보)(?:로)?\s*(?:이동|가기)?/i,
      /(?:디자인|내\s*디자인)(?:페이지)?(?:로)?\s*(?:이동|가기|보기)?/i,
      /(?:공동구매|코바이)(?:페이지)?(?:로)?\s*(?:이동|가기)?/i,
    ],
    entityExtractors: [
      { name: 'destination', pattern: /(장바구니|카트|홈|검색|마이페이지|디자인|공동구매)/ }
    ]
  },

  // Product Recommendation Intent
  {
    intent: 'product_recommendation',
    keywords: [
      '추천', '상품', '제품', '티셔츠', '후드티', '자켓',
      '맨투맨', '저렴', '인기', '가격', '원', '이하', '미만'
    ],
    patterns: [
      /(?:상품|제품)\s*추천/i,
      /(\d+(?:,\d+)?)\s*원\s*(?:이하|미만|이내)/i,
      /(?:저렴|싼|착한가격)\s*(?:상품|제품)/i,
      /(?:티셔츠|후드티|자켓|맨투맨|후드집업)\s*(?:추천|보여|찾아)/i,
      /인기\s*(?:상품|제품)/i,
      /(?:뭐|어떤)\s*(?:상품|제품)\s*(?:있어|있나요)/i,
      /추천.*(?:해줘|해주세요|부탁)/i,
    ],
    entityExtractors: [
      { name: 'maxPrice', pattern: /(\d+(?:,\d+)?)\s*원/ },
      { name: 'category', pattern: /(티셔츠|후드티|자켓|맨투맨|후드집업)/i }
    ]
  },

  // Pricing Info Intent
  {
    intent: 'pricing_info',
    keywords: [
      'DTF', 'DTG', '나염', '자수', '아플리케', '전사',
      '인쇄', '프린트', '가격', '비용', '얼마', '견적'
    ],
    patterns: [
      /(?:DTF|DTG|나염|자수|아플리케|전사)\s*(?:가격|비용|얼마)/i,
      /(?:인쇄|프린트)\s*(?:가격|비용|방법|종류)/i,
      /(?:인쇄|프린트|DTF|DTG)\s*(?:얼마)/i,
      /(?:가격표|단가표)/i,
      /(?:사이즈|크기)(?:별)?\s*(?:가격|비용)/i,
      /(?:DTF|DTG|나염|자수|아플리케)/i,
    ],
    entityExtractors: [
      { name: 'printMethod', pattern: /(DTF|DTG|나염|자수|아플리케|전사)/i }
    ]
  },

  // Order Status Intent
  {
    intent: 'order_status',
    keywords: [
      '주문', '배송', '상태', '확인', '조회', '추적',
      '언제', '도착', '배달'
    ],
    patterns: [
      /(?:주문|배송)\s*(?:상태|조회|확인|추적)/i,
      /(?:내\s*)?주문\s*(?:어디|어떻게)/i,
      /배송\s*(?:언제|상태)/i,
      /(?:주문한\s*)?(?:제품|상품)\s*(?:언제|어디)/i,
    ],
  },

  // FAQ/Help Intent
  {
    intent: 'faq_help',
    keywords: [
      '도움', '도움말', '문의', 'FAQ', '질문', '어떻게',
      '사용법', '방법', '가이드', '안내'
    ],
    patterns: [
      /(?:도움|도움말|FAQ)/i,
      /(?:어떻게)\s*(?:사용|주문|결제)/i,
      /(?:사용|주문|결제)\s*(?:방법|가이드)/i,
      /(?:문의|질문)\s*(?:하기|하고)/i,
    ],
  },

  // Greeting Intent
  {
    intent: 'greeting',
    keywords: ['안녕', '하이', '헬로', '반가워', '시작'],
    patterns: [
      /^(?:안녕|하이|헬로|반가워)/i,
      /^(?:시작|처음)/i,
    ],
  },

  // Reset Intent
  {
    intent: 'reset',
    keywords: ['처음으로', '다시', '리셋', '초기화', '새로'],
    patterns: [
      /(?:처음|다시|새로)\s*(?:시작|부터)/i,
      /(?:리셋|초기화)/i,
      /(?:대화|채팅)\s*(?:다시|초기화|리셋)/i,
    ],
  },

  // CoBuy Info Intent
  {
    intent: 'cobuy_info',
    keywords: ['공동구매', '코바이', '공구', '단체주문', '단체구매', '대량주문', '대량구매'],
    patterns: [
      /공동\s*구매\s*(?:가|이)\s*(?:뭐|무엇|뭔가)/i,
      /공동\s*구매\s*(?:어떻게|방법|설명|안내)/i,
      /코바이\s*(?:가|이)\s*(?:뭐|무엇)/i,
      /(?:공구|공동구매|코바이)\s*(?:란|이란)/i,
      /(?:단체|대량)\s*(?:주문|구매)\s*(?:하고|하려|싶|방법)/i,
      /(?:공동구매|코바이)\s*(?:알려|설명)/i,
    ],
  },
];

// Navigation route mapping
export const NAVIGATION_ROUTES: Record<string, string> = {
  '장바구니': '/cart',
  '카트': '/cart',
  '홈': '/home',
  '메인': '/home',
  '검색': '/home/search',
  '마이페이지': '/home/my-page',
  '내정보': '/home/my-page',
  '주문': '/home/my-page/orders',
  '주문내역': '/home/my-page/orders',
  '디자인': '/home/designs',
  '내디자인': '/home/designs',
  '문의': '/inquiries',
  'FAQ': '/inquiries?tab=faq',
  '고객센터': '/inquiries',
  '공동 구매': '/cobuy/page',
  '공동구매': '/cobuy/page',
  '코바이': '/cobuy/page',
  '결제': '/checkout',
};

// Category mapping (Korean to database key)
export const CATEGORY_MAPPING: Record<string, string> = {
  '티셔츠': 't-shirts',
  '후드티': 'hoodie',
  '자켓': 'jacket',
  '맨투맨': 'sweater',
  '후드집업': 'zipup',
};

// Print method Korean names
export const PRINT_METHOD_NAMES: Record<string, string> = {
  dtf: 'DTF 전사',
  dtg: 'DTG 전사',
  screen_printing: '나염',
  embroidery: '자수',
  applique: '아플리케'
};
