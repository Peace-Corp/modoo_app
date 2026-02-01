import { QuickReply, InquiryStep, ClothingType, QuantityOption } from './types';

// Category mapping for product search
export const CATEGORY_MAPPING: Record<string, string> = {
  '티셔츠': 't-shirts',
  '후드티': 'hoodie',
  '맨투맨': 'sweatshirt',
  '후드집업': 'hoodie-zip',
  '자켓': 'jacket'
};

// Step messages configuration
export const STEP_MESSAGES: Record<InquiryStep, { content: string; quickReplies?: QuickReply[] }> = {
  welcome: {
    content: '안녕하세요! 모두의 유니폼입니다.\n맞춤 상품을 추천해 드릴게요! 먼저 어떤 종류의 의류를 찾으시나요?',
    quickReplies: [
      { label: '티셔츠', action: '티셔츠', type: 'message' },
      { label: '후드티', action: '후드티', type: 'message' },
      { label: '맨투맨', action: '맨투맨', type: 'message' },
      { label: '후드집업', action: '후드집업', type: 'message' },
      { label: '자켓', action: '자켓', type: 'message' },
    ]
  },
  clothing_type: {
    content: '맞춤 상품을 추천해 드릴게요! 먼저 어떤 종류의 의류를 찾으시나요?',
    quickReplies: [
      { label: '티셔츠', action: '티셔츠', type: 'message' },
      { label: '후드티', action: '후드티', type: 'message' },
      { label: '맨투맨', action: '맨투맨', type: 'message' },
      { label: '후드집업', action: '후드집업', type: 'message' },
      { label: '자켓', action: '자켓', type: 'message' },
    ]
  },
  quantity: {
    content: '몇 벌 정도 제작을 희망하시나요?',
    quickReplies: [
      { label: '1~20벌', action: '1~20벌', type: 'message' },
      { label: '21~50벌', action: '21~50벌', type: 'message' },
      { label: '50벌 이상', action: '50벌 이상', type: 'message' },
    ]
  },
  priorities: {
    content: '중요하게 생각하시는 순서대로 3개를 골라주세요!',
  },
  needed_date: {
    content: '이 단체복이 필요한 날짜는 언제인가요?',
  },
  contact_info: {
    content: '주문 담당자 정보를 입력해주세요!',
  },
  recommendation: {
    content: '문의가 접수되었습니다! 고객님의 조건에 맞는 상품을 추천해 드릴게요.',
  },
  completed: {
    content: '추천 상품을 확인해 보세요! 더 자세한 상담이 필요하시면 언제든 연락주세요.',
    quickReplies: [
      { label: 'FAQ', action: '/inquiries?tab=faq', type: 'navigate' },
      { label: '새 문의하기', action: 'reset', type: 'message' },
    ]
  }
};

// Valid options for each step
export const CLOTHING_TYPES: ClothingType[] = ['티셔츠', '후드티', '맨투맨', '후드집업', '자켓'];
export const QUANTITY_OPTIONS: QuantityOption[] = ['1~20벌', '21~50벌', '50벌 이상'];
