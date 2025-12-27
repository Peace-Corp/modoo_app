'use client'

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (designName: string) => Promise<void>;
  isSaving?: boolean;
}

export default function AddToCartModal({ isOpen, onClose, onConfirm, isSaving = false }: AddToCartModalProps) {
  const router = useRouter();
  const [designName, setDesignName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!designName.trim()) {
      alert('디자인 이름을 입력해주세요.');
      return;
    }

    await onConfirm(designName);
    setShowSuccess(true);
  };

  const handleGoToCart = () => {
    router.push('/cart');
    // Reset state when navigating away
    setShowSuccess(false);
    setDesignName('');
    onClose();
  };

  const handleClose = () => {
    // Reset state when closing
    setShowSuccess(false);
    setDesignName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isSaving ? handleClose : undefined}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        {!showSuccess ? (
          <>
            <h2 className="text-lg font-bold text-center mb-4">
              디자인 저장
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              디자인 이름을 입력해주세요
            </p>

            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="예: 나만의 티셔츠"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition mb-6"
              disabled={isSaving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSaving) {
                  handleConfirm();
                }
              }}
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                disabled={isSaving || !designName.trim()}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? '저장 중...' : '저장하고 장바구니에 담기'}
              </button>

              <button
                onClick={handleClose}
                disabled={isSaving}
                className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-center mb-6">
              장바구니에 상품이 담겼습니다
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoToCart}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
              >
                장바구니로 가기
              </button>

              <button
                onClick={handleClose}
                className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
