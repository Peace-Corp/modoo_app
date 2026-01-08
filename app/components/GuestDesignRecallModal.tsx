'use client';

import { useState } from 'react';

interface GuestDesignRecallModalProps {
  isOpen: boolean;
  onRecall: () => Promise<void>;
  onDiscard: () => void;
}

export default function GuestDesignRecallModal({
  isOpen,
  onRecall,
  onDiscard,
}: GuestDesignRecallModalProps) {
  const [isWorking, setIsWorking] = useState(false);

  if (!isOpen) return null;

  const handleRecall = async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await onRecall();
    } finally {
      setIsWorking(false);
    }
  };

  const handleDiscard = () => {
    if (isWorking) return;
    onDiscard();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative bg-white rounded-lg w-full max-w-sm shadow-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
          저장된 디자인이 있습니다
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          이전에 저장한 디자인을 불러올까요?
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRecall}
            disabled={isWorking}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isWorking ? '불러오는 중...' : '불러오기'}
          </button>

          <button
            type="button"
            onClick={handleDiscard}
            disabled={isWorking}
            className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

