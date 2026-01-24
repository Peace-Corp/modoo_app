'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType, QuickReply } from '@/lib/chatbot/types';
import ChatMessage from './ChatMessage';

interface MessageListProps {
  messages: ChatMessageType[];
  isTyping: boolean;
  onQuickReplyClick: (reply: QuickReply) => void;
  onProductClick: (productId: string) => void;
}

export default function MessageList({
  messages,
  isTyping,
  onQuickReplyClick,
  onProductClick
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastBotMessageIndex = messages.findLastIndex(m => m.sender === 'bot');

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          onQuickReplyClick={onQuickReplyClick}
          onProductClick={onProductClick}
          isLastBotMessage={index === lastBotMessageIndex}
        />
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
