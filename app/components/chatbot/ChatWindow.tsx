'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { matchIntent, parseKoreanPrice } from '@/lib/chatbot/intentMatcher';
import { generateResponse, ResponseWithState } from '@/lib/chatbot/responseGenerator';
import { fetchProductsForRecommendation } from '@/lib/chatbot/productSearch';
import { QuickReply } from '@/lib/chatbot/types';
import { CATEGORY_MAPPING } from '@/lib/chatbot/intents';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

export default function ChatWindow() {
  const router = useRouter();
  const {
    isOpen,
    messages,
    inputValue,
    isTyping,
    conversationState,
    openChat,
    closeChat,
    addMessage,
    setInputValue,
    setIsTyping,
    startRecommendationFlow,
    updateRecommendationStep,
    updatePreferences,
    resetConversationState
  } = useChatStore();
  const { isAuthenticated } = useAuthStore();

  // Helper to handle state updates from response
  const handleStateUpdate = (stateUpdate: ResponseWithState['stateUpdate']) => {
    if (!stateUpdate) return;

    if (stateUpdate.resetFlow) {
      resetConversationState();
    } else if (stateUpdate.startFlow) {
      startRecommendationFlow();
    }

    if (stateUpdate.nextStep) {
      updateRecommendationStep(stateUpdate.nextStep);
    }

    if (stateUpdate.preferences) {
      updatePreferences(stateUpdate.preferences);
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
      // Match intent
      const intentMatch = matchIntent(text);

      // Fetch products if needed (for recommendation flow completion or direct search)
      let products = undefined;
      const isInRecommendationFlow = conversationState.activeFlow === 'product_recommendation';
      const isQuantityStep = conversationState.currentStep === 'quantity';

      if (intentMatch.intent === 'product_recommendation' || isQuantityStep) {
        const options: { maxPrice?: number; category?: string } = {};

        // Use preferences from conversation state if in flow
        if (isInRecommendationFlow) {
          if (conversationState.preferences.maxPrice) {
            options.maxPrice = conversationState.preferences.maxPrice;
          }
          if (conversationState.preferences.category) {
            options.category = CATEGORY_MAPPING[conversationState.preferences.category] || conversationState.preferences.category;
          }
        } else {
          // Use extracted entities from intent
          const { maxPrice, category } = intentMatch.extractedEntities;
          if (maxPrice) {
            options.maxPrice = parseKoreanPrice(maxPrice);
          }
          if (category) {
            options.category = CATEGORY_MAPPING[category] || category;
          }
        }

        products = await fetchProductsForRecommendation(options);

        // If no specific filters but general recommendation, get popular products
        if (Object.keys(options).length === 0 && products.length === 0) {
          products = await fetchProductsForRecommendation({ limit: 6 });
        }
      }

      // Generate response with conversation state
      const response = generateResponse(
        intentMatch,
        isAuthenticated,
        products,
        isInRecommendationFlow ? {
          currentStep: conversationState.currentStep,
          preferences: conversationState.preferences
        } : undefined
      );

      // Handle reset
      if (response === 'reset') {
        handleReset();
        return;
      }

      // Handle state updates
      handleStateUpdate(response.stateUpdate);

      // Add bot message
      addMessage(response.response);
    } catch (error) {
      console.error('Error processing message:', error);
      resetConversationState();
      addMessage({
        sender: 'bot',
        content: '죄송해요, 오류가 발생했어요. 다시 시도해 주세요.',
        contentType: 'text',
        metadata: {
          quickReplies: [
            { label: '상품 추천', action: '상품 추천해줘', type: 'message' },
            { label: 'FAQ', action: '/inquiries?tab=faq', type: 'navigate' },
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
        const event = new Event('send');
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
      const intentMatch = matchIntent(text);
      let products = undefined;

      const isInRecommendationFlow = conversationState.activeFlow === 'product_recommendation';
      const isQuantityStep = conversationState.currentStep === 'quantity';

      if (intentMatch.intent === 'product_recommendation' || isQuantityStep) {
        const options: { maxPrice?: number; category?: string } = {};

        if (isInRecommendationFlow) {
          if (conversationState.preferences.maxPrice) {
            options.maxPrice = conversationState.preferences.maxPrice;
          }
          if (conversationState.preferences.category) {
            options.category = CATEGORY_MAPPING[conversationState.preferences.category] || conversationState.preferences.category;
          }
        } else {
          const { maxPrice, category } = intentMatch.extractedEntities;
          if (maxPrice) {
            options.maxPrice = parseKoreanPrice(maxPrice);
          }
          if (category) {
            options.category = CATEGORY_MAPPING[category] || category;
          }
        }

        products = await fetchProductsForRecommendation(options);

        if (Object.keys(options).length === 0 && products.length === 0) {
          products = await fetchProductsForRecommendation({ limit: 6 });
        }
      }

      const response = generateResponse(
        intentMatch,
        isAuthenticated,
        products,
        isInRecommendationFlow ? {
          currentStep: conversationState.currentStep,
          preferences: conversationState.preferences
        } : undefined
      );

      // Handle reset
      if (response === 'reset') {
        handleReset();
        return;
      }

      // Handle state updates
      handleStateUpdate(response.stateUpdate);

      addMessage(response.response);
    } catch (error) {
      console.error('Error processing message:', error);
      resetConversationState();
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
    useChatStore.getState().clearMessages();
    resetConversationState();
    // Re-open to show welcome message
    closeChat();
    setTimeout(() => openChat(), 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-24 z-[9998] w-[calc(100vw-2rem)] max-w-[380px] h-[70vh] md:h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#3B55A5] text-white">
        <div>
          <h3 className="font-semibold">모두의 유니폼</h3>
          <p className="text-xs text-blue-200">무엇이든 물어보세요!</p>
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

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isTyping}
      />
    </div>
  );
}
