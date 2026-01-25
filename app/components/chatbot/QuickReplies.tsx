'use client';

import { QuickReply } from '@/lib/chatbot/types';

interface QuickRepliesProps {
  replies: QuickReply[];
  onReplyClick: (reply: QuickReply) => void;
}

export default function QuickReplies({ replies, onReplyClick }: QuickRepliesProps) {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {replies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onReplyClick(reply)}
          className="px-4 py-2 text-sm font-medium bg-white border-2 border-[#3B55A5] text-[#3B55A5] rounded-lg shadow-sm hover:bg-blue-50 hover:shadow-md active:scale-95 transition-all whitespace-nowrap"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
