'use client'

import { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { CartItemWithDesign } from '@/lib/cartService';
import { SizeOption } from '@/types/types';

interface QuantityChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: { itemId?: string; sizeId: string; quantity: number; currentQuantity?: number }[]) => Promise<void>;
  items: CartItemWithDesign[];
  sizeOptions: SizeOption[];
  productColorName: string;
  designName?: string;
  isSaving?: boolean;
}

export default function QuantityChangeModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  sizeOptions,
  productColorName,
  designName,
  isSaving = false
}: QuantityChangeModalProps) {
  // Initialize quantities from existing cart items (keyed by sizeId)
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach(item => {
      if (item.size_id) {
        initial[item.size_id] = item.quantity;
      }
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleQuantityChange = (sizeId: string, change: number) => {
    setQuantities(prev => {
      const current = prev[sizeId] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [sizeId]: newValue };
    });
  };

  const handleManualQuantityChange = (sizeId: string, value: string) => {
    // Allow empty string for easier editing
    if (value === '') {
      setQuantities(prev => ({ ...prev, [sizeId]: 0 }));
      return;
    }

    // Parse the value and ensure it's a valid non-negative integer
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      return; // Ignore invalid input
    }

    setQuantities(prev => ({ ...prev, [sizeId]: numValue }));
  };

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    // Use the first item's price_per_item as reference (all items in a design group have same price)
    const pricePerItem = items[0]?.price_per_item || 0;
    return getTotalQuantity() * pricePerItem;
  };

  const handleConfirm = async () => {
    const totalQuantity = getTotalQuantity();

    if (totalQuantity === 0) {
      alert('최소 1개 이상의 상품을 선택해주세요.');
      return;
    }

    // Create updates array for all size options
    const updates = sizeOptions.map(sizeOption => {
      const existingItem = items.find(item => item.size_id === sizeOption.id);
      const newQuantity = quantities[sizeOption.id] || 0;
      const currentQuantity = existingItem?.quantity || 0;

      return {
        itemId: existingItem?.id,
        sizeId: sizeOption.id,
        quantity: newQuantity,
        currentQuantity
      };
    }).filter(update => update.quantity !== update.currentQuantity); // Only include changed items

    await onConfirm(updates);
    onClose();
  };

  const handleClose = () => {
    // Reset quantities to original values
    const resetQuantities: Record<string, number> = {};
    items.forEach(item => {
      if (item.size_id) {
        resetQuantities[item.size_id] = item.quantity;
      }
    });
    setQuantities(resetQuantities);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-end">
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
            <h2 className="text-lg font-bold">수량 변경</h2>
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
          {/* Design Name */}
          {designName && (
            <div className="mt-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">디자인</p>
              <p className="font-medium">{designName}</p>
            </div>
          )}

          {/* Size Options List */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">사이즈 및 수량</h3>
            <div className="space-y-3">
              {sizeOptions.map((sizeOption) => {
                const quantity = quantities[sizeOption.id] || 0;
                return (
                  <div
                    key={sizeOption.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition ${
                      quantity > 0
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex-1">
                      <span className="font-medium">{sizeOption.name}</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {productColorName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(sizeOption.id, -1)}
                        disabled={quantity === 0 || isSaving}
                        className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => handleManualQuantityChange(sizeOption.id, e.target.value)}
                        disabled={isSaving}
                        className="min-w-12 w-12 text-center font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-black transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={() => handleQuantityChange(sizeOption.id, 1)}
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
            disabled={isSaving || getTotalQuantity() === 0}
            className="w-full py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? '처리 중...' : '수량 변경'}
          </button>
        </div>
      </div>
    </div>
  );
}
