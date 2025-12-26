'use client'

import { useRouter } from 'next/navigation';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToCartModal({ isOpen, onClose }: AddToCartModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToCart = () => {
    router.push('/cart');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
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
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
