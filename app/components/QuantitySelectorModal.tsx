'use client'

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { SizeOption, CartItem } from '@/types/types';

interface QuantitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (designName: string, selectedItems: CartItem[]) => Promise<void>;
  sizeOptions: SizeOption[];
  pricePerItem: number;
  isSaving?: boolean;
}

export default function QuantitySelectorModal({
  isOpen,
  onClose,
  onConfirm,
  sizeOptions,
  pricePerItem,
  isSaving = false
}: QuantitySelectorModalProps) {
  const router = useRouter();
  const [designName, setDesignName] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleQuantityChange = (sizeId: string, change: number) => {
    setQuantities(prev => {
      const current = prev[sizeId] || 0;
      const newValue = Math.max(0, current + change);

      if (newValue === 0) {
        const { [sizeId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [sizeId]: newValue };
    });
  };

  const handleManualQuantityChange = (sizeId: string, value: string) => {
    // Allow empty string for easier editing
    if (value === '') {
      setQuantities(prev => {
        const { [sizeId]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    // Parse the value and ensure it's a valid non-negative integer
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      return; // Ignore invalid input
    }

    if (numValue === 0) {
      setQuantities(prev => {
        const { [sizeId]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setQuantities(prev => ({ ...prev, [sizeId]: numValue }));
    }
  };

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return getTotalQuantity() * pricePerItem;
  };

  const handleConfirm = async () => {
    const totalQuantity = getTotalQuantity();

    if (totalQuantity === 0) {
      alert('수량을 선택해주세요.');
      return;
    }

    if (!designName.trim()) {
      alert('디자인 이름을 입력해주세요.');
      return;
    }

    // Convert quantities to CartItem array
    const selectedItems: CartItem[] = Object.entries(quantities).map(([sizeId, quantity]) => {
      const size = sizeOptions.find(s => s.id === sizeId);
      return {
        sizeId,
        sizeName: size?.name || sizeId,
        quantity
      };
    });

    await onConfirm(designName, selectedItems);
    setShowSuccess(true);
  };

  const handleGoToCart = () => {
    router.push('/cart');
    // Reset state when navigating away
    setShowSuccess(false);
    setDesignName('');
    setQuantities({});
    onClose();
  };

  const handleClose = () => {
    // Reset state when closing
    setShowSuccess(false);
    setDesignName('');
    setQuantities({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={!isSaving ? handleClose : undefined}
      />

      {/* Modal Content - Slide up from bottom */}
      <div
        className={`relative bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle bar */}
        <div className="sticky top-0 bg-white pt-3 pb-2 border-b border-gray-200 z-10">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between px-4 pb-2">
            <h2 className="text-lg font-bold">
              {!showSuccess ? '옵션 선택' : '장바구니에 담겼습니다'}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="p-1 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-6">
          {!showSuccess ? (
            <>
              {/* Design Name Input */}
              <div className="mt-4 mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  디자인 이름
                </label>
                <input
                  type="text"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder="예: 나만의 티셔츠"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
                  disabled={isSaving}
                />
              </div>

              {/* Size Options */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">사이즈 및 수량</h3>
                <div className="space-y-3">
                  {sizeOptions.map((size) => {
                    const quantity = quantities[size.id] || 0;
                    return (
                      <div
                        key={size.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition ${
                          quantity > 0
                            ? 'border-black bg-gray-50'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        <span className="font-medium">{size.name}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleQuantityChange(size.id, -1)}
                            disabled={quantity === 0 || isSaving}
                            className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => handleManualQuantityChange(size.id, e.target.value)}
                            disabled={isSaving}
                            className="min-w-12 w-12 text-center font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-black transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            onClick={() => handleQuantityChange(size.id, 1)}
                            disabled={isSaving}
                            className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-30"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Summary */}
              {getTotalQuantity() > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">개당 가격 (디자인 포함)</span>
                    <span className="font-medium">{pricePerItem.toLocaleString('ko-KR')}원</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">총 수량</span>
                    <span className="font-medium">{getTotalQuantity()}개</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold">총 금액</span>
                    <span className="text-lg font-bold">{getTotalPrice().toLocaleString('ko-KR')}원</span>
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                disabled={isSaving || getTotalQuantity() === 0 || !designName.trim()}
                className="w-full py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? '처리 중...' : '장바구니에 담기'}
              </button>
            </>
          ) : (
            <>
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-6">
                  {getTotalQuantity()}개의 상품이 담겼습니다
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGoToCart}
                  className="w-full py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
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
    </div>
  );
}
