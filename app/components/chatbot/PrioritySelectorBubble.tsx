'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Priority } from '@/lib/chatbot/types';

const PRIORITY_OPTIONS: Priority[] = ['빠른 제작', '퀄리티', '가격', '자세한 상담'];

interface PrioritySelectorBubbleProps {
  onSubmit: (priorities: Priority[]) => void;
  disabled?: boolean;
}

export default function PrioritySelectorBubble({ onSubmit, disabled }: PrioritySelectorBubbleProps) {
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);

  const handlePriorityToggle = (priority: Priority) => {
    if (disabled) return;
    setSelectedPriorities(prev => {
      if (prev.includes(priority)) {
        return prev.filter(p => p !== priority);
      } else if (prev.length < 3) {
        return [...prev, priority];
      }
      return prev;
    });
  };

  const handleSubmit = () => {
    if (selectedPriorities.length === 0 || disabled) return;
    onSubmit(selectedPriorities);
  };

  const getGuideText = () => {
    if (selectedPriorities.length === 0) {
      return '최소 1개를 선택해주세요 (최대 3개)';
    }
    if (selectedPriorities.length < 3) {
      return `${selectedPriorities.length}개 선택됨 (최대 3개까지 가능)`;
    }
    return '선택 완료! 아래 버튼을 눌러주세요.';
  };

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-2">
        {getGuideText()}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRIORITY_OPTIONS.map((priority) => {
          const selectedIndex = selectedPriorities.indexOf(priority);
          const isSelected = selectedIndex !== -1;
          return (
            <button
              key={priority}
              onClick={() => handlePriorityToggle(priority)}
              disabled={disabled}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
      {selectedPriorities.length > 0 && (
        <>
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="w-full py-2.5 bg-[#3B55A5] text-white text-sm font-medium rounded-lg hover:bg-[#2D4280] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            선택 완료
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">
            선택: {selectedPriorities.join(' → ')}
          </p>
        </>
      )}
    </div>
  );
}
