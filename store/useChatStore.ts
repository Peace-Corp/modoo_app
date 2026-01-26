import { create } from 'zustand';
import { ChatMessage, QuickReply, InquiryFlowState, InquiryStep, InquiryData } from '@/lib/chatbot/types';

const INITIAL_INQUIRY_STATE: InquiryFlowState = {
  currentStep: 'welcome',
  inquiryData: {},
  inquiryId: undefined,
  isSubmitting: false,
  error: undefined
};

interface ChatState {
  // UI State
  isOpen: boolean;

  // Messages (session-only, not persisted)
  messages: ChatMessage[];

  // Input state
  inputValue: string;
  isTyping: boolean;

  // Inquiry flow state
  inquiryFlow: InquiryFlowState;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setInputValue: (value: string) => void;
  setIsTyping: (typing: boolean) => void;
  clearMessages: () => void;

  addQuickRepliesToLastMessage: (quickReplies: QuickReply[]) => void;

  // Inquiry flow actions
  setInquiryStep: (step: InquiryStep) => void;
  updateInquiryData: (data: Partial<InquiryData>) => void;
  setInquiryId: (id: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setInquiryError: (error: string | undefined) => void;
  resetInquiryFlow: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  content: '안녕하세요! 모두의 유니폼입니다.\n맞춤 상품을 추천해 드릴게요! 먼저 어떤 종류의 의류를 찾으시나요?',
  contentType: 'inquiry_step',
  timestamp: Date.now(),
  metadata: {
    inquiryStep: 'clothing_type',
    quickReplies: [
      { label: '티셔츠', action: '티셔츠', type: 'message' },
      { label: '후드티', action: '후드티', type: 'message' },
      { label: '맨투맨', action: '맨투맨', type: 'message' },
      { label: '후드집업', action: '후드집업', type: 'message' },
      { label: '자켓', action: '자켓', type: 'message' },
    ]
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isOpen: false,
  messages: [],
  inputValue: '',
  isTyping: false,
  inquiryFlow: INITIAL_INQUIRY_STATE,

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
        }],
        inquiryFlow: {
          ...INITIAL_INQUIRY_STATE,
          currentStep: 'clothing_type'
        }
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

  // Inquiry flow actions
  setInquiryStep: (step) => set((state) => ({
    inquiryFlow: {
      ...state.inquiryFlow,
      currentStep: step
    }
  })),

  updateInquiryData: (data) => set((state) => ({
    inquiryFlow: {
      ...state.inquiryFlow,
      inquiryData: {
        ...state.inquiryFlow.inquiryData,
        ...data
      }
    }
  })),

  setInquiryId: (id) => set((state) => ({
    inquiryFlow: {
      ...state.inquiryFlow,
      inquiryId: id
    }
  })),

  setIsSubmitting: (submitting) => set((state) => ({
    inquiryFlow: {
      ...state.inquiryFlow,
      isSubmitting: submitting
    }
  })),

  setInquiryError: (error) => set((state) => ({
    inquiryFlow: {
      ...state.inquiryFlow,
      error
    }
  })),

  resetInquiryFlow: () => set({
    inquiryFlow: INITIAL_INQUIRY_STATE,
    messages: []
  }),
}));
