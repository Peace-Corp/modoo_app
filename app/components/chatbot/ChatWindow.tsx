'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, Calendar } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { QuickReply, InquiryStep, ClothingType, QuantityOption, Priority } from '@/lib/chatbot/types';
import { fetchProductsForRecommendation } from '@/lib/chatbot/productSearch';
import MessageList from './MessageList';

// Category mapping for product search
const CATEGORY_MAPPING: Record<string, string> = {
  '티셔츠': 't-shirts',
  '후드티': 'hoodie',
  '맨투맨': 'sweatshirt',
  '후드집업': 'hoodie-zip',
  '자켓': 'jacket'
};

// Step messages configuration
const STEP_MESSAGES: Record<InquiryStep, { content: string; quickReplies?: QuickReply[] }> = {
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
      { label: '10벌', action: '10벌', type: 'message' },
      { label: '30벌', action: '30벌', type: 'message' },
      { label: '50벌', action: '50벌', type: 'message' },
      { label: '100벌 이상', action: '100벌 이상', type: 'message' },
    ]
  },
  priorities: {
    content: '중요하게 생각하시는 순서대로 3개를 골라주세요!',
  },
  needed_date: {
    content: '이 단체복이 필요한 날짜는 언제인가요?',
  },
  contact_info: {
    content: '주문 담당자 성함과 연락처를 알려주세요!\n(예: 홍길동 010-1234-5678)',
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
const CLOTHING_TYPES: ClothingType[] = ['티셔츠', '후드티', '맨투맨', '후드집업', '자켓'];
const QUANTITY_OPTIONS: QuantityOption[] = ['10벌', '30벌', '50벌', '100벌 이상'];
const PRIORITY_OPTIONS: Priority[] = ['빠른 제작', '퀄리티', '가격', '자세한 상담'];

export default function ChatWindow() {
  const router = useRouter();
  const {
    isOpen,
    messages,
    inputValue,
    isTyping,
    inquiryFlow,
    openChat,
    closeChat,
    addMessage,
    setInputValue,
    setIsTyping,
    setInquiryStep,
    updateInquiryData,
    setInquiryId,
    setIsSubmitting,
    resetInquiryFlow
  } = useChatStore();

  // Multi-select priority state
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);

  // Date picker state
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Privacy consent state
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Get next step in the flow
  const getNextStep = (currentStep: InquiryStep): InquiryStep => {
    const stepOrder: InquiryStep[] = [
      'clothing_type',
      'quantity',
      'priorities',
      'needed_date',
      'contact_info',
      'recommendation',
      'completed'
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    return currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : 'completed';
  };

  // Add bot message for a step
  const addBotMessage = (step: InquiryStep, extraContent?: string, products?: any[]) => {
    const stepConfig = STEP_MESSAGES[step];
    const content = extraContent ? `${extraContent}\n\n${stepConfig.content}` : stepConfig.content;

    addMessage({
      sender: 'bot',
      content,
      contentType: products ? 'products' : 'inquiry_step',
      metadata: {
        inquiryStep: step,
        quickReplies: stepConfig.quickReplies,
        products
      }
    });
  };

  // Submit inquiry to API
  const submitInquiry = async () => {
    const { inquiryData } = inquiryFlow;

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/chatbot/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clothingType: inquiryData.clothingType,
          quantity: inquiryData.quantity,
          priorities: inquiryData.priorities,
          neededDate: inquiryData.neededDate,
          neededDateFlexible: inquiryData.neededDateFlexible,
          contactName: inquiryData.contactName,
          contactEmail: inquiryData.contactEmail,
          contactPhone: inquiryData.contactPhone
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit inquiry');
      }

      setInquiryId(result.inquiry.id);
      return true;
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch recommended products based on inquiry data
  const fetchRecommendations = async () => {
    const { inquiryData } = inquiryFlow;
    const category = inquiryData.clothingType ? CATEGORY_MAPPING[inquiryData.clothingType] : undefined;

    try {
      const products = await fetchProductsForRecommendation({
        category,
        limit: 3
      });
      return products;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  };

  // Handle user response based on current step
  const handleStepResponse = async (text: string) => {
    const { currentStep, inquiryData } = inquiryFlow;

    // Handle reset command
    if (text === 'reset' || text === '새 문의하기') {
      handleReset();
      return;
    }

    switch (currentStep) {
      case 'clothing_type':
        if (CLOTHING_TYPES.includes(text as ClothingType)) {
          updateInquiryData({ clothingType: text as ClothingType });
          setInquiryStep('quantity');
          addBotMessage('quantity', `${text}을(를) 선택하셨네요!`);
        } else {
          addBotMessage('clothing_type', '아래 옵션 중에서 선택해주세요.');
        }
        break;

      case 'quantity':
        if (QUANTITY_OPTIONS.includes(text as QuantityOption)) {
          updateInquiryData({ quantity: text as QuantityOption });
          setInquiryStep('priorities');
          addBotMessage('priorities', `${text}을(를) 선택하셨네요!`);
        } else {
          addBotMessage('quantity', '아래 옵션 중에서 선택해주세요.');
        }
        break;

      case 'priorities':
        // Handled by handlePrioritiesSubmit directly
        break;

      case 'needed_date':
        // Handled by handleDateSubmit/handleFlexibleDate directly
        break;

      case 'contact_info':
        // Handled by handleContactFormSubmit directly
        break;

      case 'completed':
        // Handle navigation or reset
        if (text === 'reset' || text === '새 문의하기') {
          handleReset();
        }
        break;

      default:
        addBotMessage('clothing_type');
        break;
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    // Add user message
    addMessage({
      sender: 'user',
      content: text,
      contentType: 'text'
    });
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await handleStepResponse(text);
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage({
        sender: 'bot',
        content: '죄송해요, 오류가 발생했어요. 다시 시도해 주세요.',
        contentType: 'text',
        metadata: {
          quickReplies: [
            { label: '새 문의하기', action: 'reset', type: 'message' },
          ]
        }
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReplyClick = (reply: QuickReply) => {
    if (reply.type === 'navigate') {
      router.push(reply.action);
      closeChat();
    } else {
      setInputValue(reply.action);
      // Auto-send the message
      setTimeout(() => {
        handleSendFromQuickReply(reply.action);
      }, 100);
    }
  };

  const handleSendFromQuickReply = async (text: string) => {
    if (isTyping) return;

    // Add user message
    addMessage({
      sender: 'user',
      content: text,
      contentType: 'text'
    });
    setInputValue('');
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await handleStepResponse(text);
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage({
        sender: 'bot',
        content: '죄송해요, 오류가 발생했어요. 다시 시도해 주세요.',
        contentType: 'text'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleProductClick = (productId: string) => {
    router.push(`/editor/${productId}`);
    closeChat();
  };

  const handleReset = () => {
    setIsTyping(false);
    setSelectedPriorities([]);
    setSelectedDate('');
    setContactForm({ name: '', email: '', phone: '' });
    setPrivacyConsent(false);
    resetInquiryFlow();
    // Re-open to show welcome message
    closeChat();
    setTimeout(() => openChat(), 100);
  };

  // Handle priority toggle in multi-select mode
  const handlePriorityToggle = (priority: Priority) => {
    setSelectedPriorities(prev => {
      if (prev.includes(priority)) {
        // Remove if already selected
        return prev.filter(p => p !== priority);
      } else if (prev.length < 3) {
        // Add if less than 3 selected
        return [...prev, priority];
      }
      return prev;
    });
  };

  // Submit selected priorities (no user message shown)
  const handlePrioritiesSubmit = async () => {
    if (selectedPriorities.length !== 3 || isTyping) return;

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    updateInquiryData({ priorities: [...selectedPriorities] });
    setSelectedPriorities([]);
    setInquiryStep('needed_date');
    addBotMessage('needed_date', `우선순위: ${selectedPriorities.join(' → ')}`);

    setIsTyping(false);
  };

  // Handle date picker submit (no user message shown)
  const handleDateSubmit = async () => {
    if (!selectedDate || isTyping) return;

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    updateInquiryData({ neededDate: selectedDate, neededDateFlexible: false });
    const dateDisplay = selectedDate;
    setSelectedDate('');
    setInquiryStep('contact_info');
    addBotMessage('contact_info', `날짜: ${dateDisplay}`);

    setIsTyping(false);
  };

  // Handle flexible date selection (no user message shown)
  const handleFlexibleDate = async () => {
    if (isTyping) return;

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    updateInquiryData({ neededDate: null, neededDateFlexible: true });
    setSelectedDate('');
    setInquiryStep('contact_info');
    addBotMessage('contact_info', '날짜: 크게 상관 없음');

    setIsTyping(false);
  };

  // Handle contact form submit (no user message shown)
  const handleContactFormSubmit = async () => {
    const { name, email, phone } = contactForm;
    if (!name.trim() || !phone.trim() || isTyping || inquiryFlow.isSubmitting) return;

    setIsTyping(true);

    // Update inquiry data with contact info
    const contactName = name.trim();
    const contactEmail = email.trim() || undefined;
    const contactPhone = phone.trim();

    updateInquiryData({ contactName, contactEmail, contactPhone });
    setContactForm({ name: '', email: '', phone: '' });
    setInquiryStep('recommendation');

    // Add confirmation message
    addMessage({
      sender: 'bot',
      content: `${contactName}님, 문의를 접수 중입니다...`,
      contentType: 'text'
    });

    // Submit inquiry directly with all the data
    try {
      setIsSubmitting(true);
      const { inquiryData } = inquiryFlow;

      const response = await fetch('/api/chatbot/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clothingType: inquiryData.clothingType,
          quantity: inquiryData.quantity,
          priorities: inquiryData.priorities,
          neededDate: inquiryData.neededDate || null,
          neededDateFlexible: inquiryData.neededDateFlexible ?? false,
          contactName,
          contactEmail: contactEmail || null,
          contactPhone
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit inquiry');
      }

      setInquiryId(result.inquiry.id);

      // Fetch and show recommendations
      const products = await fetchRecommendations();

      if (products.length > 0) {
        addMessage({
          sender: 'bot',
          content: '문의가 접수되었습니다! 담당자가 빠르게 연락드릴게요.\n\n고객님의 조건에 맞는 추천 상품이에요:',
          contentType: 'products',
          metadata: {
            products,
            inquiryStep: 'completed',
            quickReplies: STEP_MESSAGES.completed.quickReplies
          }
        });
      } else {
        addBotMessage('completed', '문의가 접수되었습니다! 담당자가 빠르게 연락드릴게요.');
      }
      setInquiryStep('completed');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      addMessage({
        sender: 'bot',
        content: '죄송합니다. 문의 접수 중 오류가 발생했어요. 다시 시도해주세요.',
        contentType: 'text',
        metadata: {
          quickReplies: [
            { label: '새 문의하기', action: 'reset', type: 'message' }
          ]
        }
      });
    } finally {
      setIsSubmitting(false);
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-24 z-[9998] w-[calc(100vw-2rem)] max-w-[380px] h-[70vh] md:h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#3B55A5] text-white">
        <div>
          <h3 className="font-semibold">모두의 유니폼</h3>
          <p className="text-xs text-blue-200">맞춤 상품 추천</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 text-white rounded-full transition-all"
          >
            처음으로
          </button>
          <button
            onClick={closeChat}
            className="p-1 hover:bg-[#2D4280] rounded-full transition-colors"
            aria-label="채팅 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isTyping={isTyping}
        onQuickReplyClick={handleQuickReplyClick}
        onProductClick={handleProductClick}
      />

      {/* Date Picker UI */}
      {inquiryFlow.currentStep === 'needed_date' && !isTyping && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                필요한 날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleFlexibleDate}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                크게 상관 없음
              </button>
              <button
                onClick={handleDateSubmit}
                disabled={!selectedDate}
                className="flex-1 py-2.5 bg-[#3B55A5] text-white text-sm font-medium rounded-lg hover:bg-[#2D4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                선택 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Multi-Select UI */}
      {inquiryFlow.currentStep === 'priorities' && !isTyping && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">
            {selectedPriorities.length === 3
              ? '선택 완료! 아래 버튼을 눌러주세요.'
              : `${3 - selectedPriorities.length}개 더 선택해주세요`}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRIORITY_OPTIONS.map((priority) => {
              const selectedIndex = selectedPriorities.indexOf(priority);
              const isSelected = selectedIndex !== -1;
              return (
                <button
                  key={priority}
                  onClick={() => handlePriorityToggle(priority)}
                  className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    isSelected
                      ? 'bg-[#3B55A5] text-white ring-2 ring-[#3B55A5] ring-offset-1'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-[#3B55A5] hover:text-[#3B55A5]'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-[#3B55A5] text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {selectedIndex + 1}
                    </span>
                  )}
                  {priority}
                </button>
              );
            })}
          </div>
          {selectedPriorities.length === 3 && (
            <button
              onClick={handlePrioritiesSubmit}
              className="w-full py-2.5 bg-[#3B55A5] text-white text-sm font-medium rounded-lg hover:bg-[#2D4280] transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              선택 완료
            </button>
          )}
          {selectedPriorities.length > 0 && selectedPriorities.length < 3 && (
            <p className="text-xs text-center text-gray-400 mt-2">
              선택: {selectedPriorities.join(' → ')}
            </p>
          )}
        </div>
      )}

      {/* Contact Form UI */}
      {inquiryFlow.currentStep === 'contact_info' && !isTyping && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="홍길동"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">연락처 *</label>
              <input
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="w-4 h-4 text-[#3B55A5] border-gray-300 rounded focus:ring-[#3B55A5]"
              />
              <span className="text-xs text-gray-600">개인정보 활용 동의 *</span>
            </label>
            <button
              onClick={handleContactFormSubmit}
              disabled={!contactForm.name.trim() || !contactForm.phone.trim() || !privacyConsent || inquiryFlow.isSubmitting}
              className="w-full py-2.5 bg-[#3B55A5] text-white text-sm font-medium rounded-lg hover:bg-[#2D4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inquiryFlow.isSubmitting ? '문의 접수 중...' : '문의하기'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
