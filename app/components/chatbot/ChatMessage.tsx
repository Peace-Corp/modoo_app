'use client';

import { ChatMessage as ChatMessageType, QuickReply } from '@/lib/chatbot/types';
import { LogIn } from 'lucide-react';
import ProductCard from './ProductCard';
import PricingTable from './PricingTable';
import QuickReplies from './QuickReplies';

interface ChatMessageProps {
  message: ChatMessageType;
  onQuickReplyClick: (reply: QuickReply) => void;
  onProductClick: (productId: string) => void;
  isLastBotMessage?: boolean;
}

export default function ChatMessage({
  message,
  onQuickReplyClick,
  onProductClick,
  isLastBotMessage
}: ChatMessageProps) {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-[#3B55A5] text-white rounded-2xl rounded-br-md px-4 py-2'
            : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-2'
        }`}
      >
        {/* Login prompt icon */}
        {message.contentType === 'login_prompt' && (
          <div className="flex items-center gap-2 mb-2 text-amber-600">
            <LogIn className="w-4 h-4" />
            <span className="text-sm font-medium">로그인 필요</span>
          </div>
        )}

        {/* Text content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Product recommendations */}
        {message.contentType === 'products' && message.metadata?.products && (
          <div className="mt-3 space-y-2">
            {message.metadata.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => onProductClick(product.id)}
              />
            ))}
          </div>
        )}

        {/* Pricing table */}
        {message.contentType === 'pricing' && message.metadata?.pricingData && (
          <div className="mt-3">
            <PricingTable data={message.metadata.pricingData} />
          </div>
        )}

        {/* Quick replies - only show on last bot message */}
        {!isUser && isLastBotMessage && message.metadata?.quickReplies && (
          <QuickReplies
            replies={message.metadata.quickReplies}
            onReplyClick={onQuickReplyClick}
          />
        )}
      </div>
    </div>
  );
}
