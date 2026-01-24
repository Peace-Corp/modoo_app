'use client';

import { MessageCircle, X } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

export default function ChatBubble() {
  const { isOpen, openChat, closeChat } = useChatStore();

  const handleClick = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[9998] w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      aria-label={isOpen ? '채팅 닫기' : '채팅 열기'}
    >
      {isOpen ? (
        <X className="w-6 h-6" />
      ) : (
        <MessageCircle className="w-6 h-6" />
      )}
    </button>
  );
}
