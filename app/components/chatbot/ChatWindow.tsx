'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { QuickReply, InquiryStep, ClothingType, QuantityOption, Priority } from '@/lib/chatbot/types';
import { STEP_MESSAGES, CATEGORY_MAPPING, CLOTHING_TYPES, QUANTITY_OPTIONS } from '@/lib/chatbot/config';
import { fetchProductsForRecommendation } from '@/lib/chatbot/productSearch';
import MessageList from './MessageList';

export default function ChatWindow() {
  const router = useRouter();
  const {
    isOpen,
    messages,
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

  // Add bot message for a step
  const addBotMessage = (step: InquiryStep, extraContent?: string, products?: any[]) => {
    const stepConfig = STEP_MESSAGES[step];
    const content = extraContent ? `${extraContent}\n\n${stepConfig.content}` : stepConfig.content;

    // Determine content type based on step
    let contentType: 'products' | 'inquiry_step' | 'date_picker' | 'priority_selector' | 'contact_form' = 'inquiry_step';
    if (products) {
      contentType = 'products';
    } else if (step === 'needed_date') {
      contentType = 'date_picker';
    } else if (step === 'priorities') {
      contentType = 'priority_selector';
    } else if (step === 'contact_info') {
      contentType = 'contact_form';
    }

    addMessage({
      sender: 'bot',
      content,
      contentType,
      metadata: {
        inquiryStep: step,
        quickReplies: stepConfig.quickReplies,
        products
      }
    });
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
    resetInquiryFlow();
    // Re-open to show welcome message
    closeChat();
    setTimeout(() => openChat(), 100);
  };

  // Handle date submission from bubble component
  const handleDateSubmit = async (date: string | null, flexible: boolean) => {
    if (isTyping) return;

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    updateInquiryData({ neededDate: date, neededDateFlexible: flexible });
    setInquiryStep('contact_info');
    const dateDisplay = flexible ? '크게 상관 없음' : date;
    addBotMessage('contact_info', `날짜: ${dateDisplay}`);

    setIsTyping(false);
  };

  // Handle priorities submission from bubble component
  const handlePrioritiesSubmit = async (priorities: Priority[]) => {
    if (isTyping) return;

    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    updateInquiryData({ priorities });
    setInquiryStep('needed_date');
    addBotMessage('needed_date', `우선순위: ${priorities.join(' → ')}`);

    setIsTyping(false);
  };

  // Handle contact form submission from bubble component
  const handleContactSubmit = async (name: string, email: string, phone: string) => {
    if (isTyping || inquiryFlow.isSubmitting) return;

    setIsTyping(true);

    const contactName = name;
    const contactEmail = email || undefined;
    const contactPhone = phone;

    updateInquiryData({ contactName, contactEmail, contactPhone });
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
        onDateSubmit={handleDateSubmit}
        onPrioritiesSubmit={handlePrioritiesSubmit}
        onContactSubmit={handleContactSubmit}
        isSubmitting={inquiryFlow.isSubmitting}
      />
    </div>
  );
}
