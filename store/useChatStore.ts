import { create } from 'zustand';
import { ChatMessage, QuickReply, ConversationState, RecommendationPreferences, RecommendationStep } from '@/lib/chatbot/types';

const INITIAL_CONVERSATION_STATE: ConversationState = {
  activeFlow: null,
  currentStep: 'initial',
  preferences: {}
};

interface ChatState {
  // UI State
  isOpen: boolean;

  // Messages (session-only, not persisted)
  messages: ChatMessage[];

  // Input state
  inputValue: string;
  isTyping: boolean;

  // Conversation state for multi-step flows
  conversationState: ConversationState;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setInputValue: (value: string) => void;
  setIsTyping: (typing: boolean) => void;
  clearMessages: () => void;

  addQuickRepliesToLastMessage: (quickReplies: QuickReply[]) => void;

  // Conversation state actions
  startRecommendationFlow: () => void;
  updateRecommendationStep: (step: RecommendationStep) => void;
  updatePreferences: (preferences: Partial<RecommendationPreferences>) => void;
  resetConversationState: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  content: '안녕하세요! 모두의 유니폼 챗봇입니다. 무엇을 도와드릴까요?',
  contentType: 'text',
  timestamp: Date.now(),
  metadata: {
    quickReplies: [
      { label: '상품 추천', action: '상품 추천해줘', type: 'message' },
      { label: '공동구매란?', action: '공동구매가 뭐야?', type: 'message' },
      { label: '인쇄 가격', action: '인쇄 가격 알려줘', type: 'message' },
      { label: 'FAQ', action: '/inquiries?tab=faq', type: 'navigate' },
    ]
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isOpen: false,
  messages: [],
  inputValue: '',
  isTyping: false,
  conversationState: INITIAL_CONVERSATION_STATE,

  // UI Actions
  toggleChat: () => set((state) => ({
    isOpen: !state.isOpen
  })),

  openChat: () => {
    const state = get();
    // Add welcome message if first open
    if (state.messages.length === 0) {
      set({
        isOpen: true,
        messages: [{
          ...WELCOME_MESSAGE,
          timestamp: Date.now()
        }]
      });
    } else {
      set({ isOpen: true });
    }
  },

  closeChat: () => set({ isOpen: false }),

  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
      }
    ]
  })),

  setInputValue: (value) => set({ inputValue: value }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  clearMessages: () => set({ messages: [] }),

  addQuickRepliesToLastMessage: (quickReplies) => set((state) => {
    const messages = [...state.messages];
    const lastBotMessageIndex = messages.findLastIndex(m => m.sender === 'bot');
    if (lastBotMessageIndex !== -1) {
      messages[lastBotMessageIndex] = {
        ...messages[lastBotMessageIndex],
        metadata: {
          ...messages[lastBotMessageIndex].metadata,
          quickReplies
        }
      };
    }
    return { messages };
  }),

  // Conversation state actions
  startRecommendationFlow: () => set({
    conversationState: {
      activeFlow: 'product_recommendation',
      currentStep: 'category',
      preferences: {}
    }
  }),

  updateRecommendationStep: (step) => set((state) => ({
    conversationState: {
      ...state.conversationState,
      currentStep: step
    }
  })),

  updatePreferences: (preferences) => set((state) => ({
    conversationState: {
      ...state.conversationState,
      preferences: {
        ...state.conversationState.preferences,
        ...preferences
      }
    }
  })),

  resetConversationState: () => set({
    conversationState: INITIAL_CONVERSATION_STATE
  }),
}));
