'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { matchIntent, parseKoreanPrice } from '@/lib/chatbot/intentMatcher';
import { generateResponse } from '@/lib/chatbot/responseGenerator';
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
    closeChat,
    addMessage,
    setInputValue,
    setIsTyping
  } = useChatStore();
  const { isAuthenticated } = useAuthStore();

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

      // Fetch products if needed
      let products = undefined;
      if (intentMatch.intent === 'product_recommendation') {
        const { maxPrice, category } = intentMatch.extractedEntities;
        const options: { maxPrice?: number; category?: string } = {};

        if (maxPrice) {
          options.maxPrice = parseKoreanPrice(maxPrice);
        }
        if (category) {
          options.category = CATEGORY_MAPPING[category] || category;
        }

        products = await fetchProductsForRecommendation(options);

        // If no specific filters but general recommendation, get popular products
        if (!maxPrice && !category && products.length === 0) {
          products = await fetchProductsForRecommendation({ limit: 6 });
        }
      }

      // Generate response
      const response = generateResponse(intentMatch, isAuthenticated, products);

      // Add bot message
      addMessage(response);
    } catch (error) {
      console.error('Error processing message:', error);
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

      if (intentMatch.intent === 'product_recommendation') {
        const { maxPrice, category } = intentMatch.extractedEntities;
        const options: { maxPrice?: number; category?: string } = {};

        if (maxPrice) {
          options.maxPrice = parseKoreanPrice(maxPrice);
        }
        if (category) {
          options.category = CATEGORY_MAPPING[category] || category;
        }

        products = await fetchProductsForRecommendation(options);

        if (!maxPrice && !category && products.length === 0) {
          products = await fetchProductsForRecommendation({ limit: 6 });
        }
      }

      const response = generateResponse(intentMatch, isAuthenticated, products);
      addMessage(response);
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
    router.push(`/product/${productId}`);
    closeChat();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-24 z-[9998] w-[calc(100vw-2rem)] max-w-[380px] h-[70vh] md:h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
        <div>
          <h3 className="font-semibold">모두의 유니폼</h3>
          <p className="text-xs text-blue-100">무엇이든 물어보세요!</p>
        </div>
        <button
          onClick={closeChat}
          className="p-1 hover:bg-blue-700 rounded-full transition-colors"
          aria-label="채팅 닫기"
        >
          <X className="w-5 h-5" />
        </button>
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
