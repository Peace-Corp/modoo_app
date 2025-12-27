'use client';

import { useCartStore } from '@/store/useCartStore';
import Header from '@/app/components/Header';
import { Plus, Minus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import DesignEditModal from '@/app/components/DesignEditModal';

// Group items by saved design ID
interface GroupedCartItem {
  savedDesignId: string;
  thumbnailUrl?: string;
  productTitle: string;
  designName?: string;
  items: Array<{
    id: string;
    productId: string;
    productTitle: string;
    productColor: string;
    productColorName: string;
    sizeId: string;
    sizeName: string;
    quantity: number;
    pricePerItem: number;
    canvasState: Record<string, string>;
    thumbnailUrl?: string;
    addedAt: number;
    savedDesignId?: string;
    designName?: string;
  }>;
  totalQuantity: number;
  totalPrice: number;
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotalQuantity, getTotalPrice } = useCartStore();
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Wait for client-side mount to prevent hydration mismatch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Group items by savedDesignId
  const groupedItems: GroupedCartItem[] = items.reduce((acc, item) => {
    const designId = item.savedDesignId || item.id; // Fallback to item.id if no savedDesignId
    const existingGroup = acc.find(g => g.savedDesignId === designId);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalQuantity += item.quantity;
      existingGroup.totalPrice += item.pricePerItem * item.quantity;
    } else {
      acc.push({
        savedDesignId: designId,
        thumbnailUrl: item.thumbnailUrl,
        productTitle: item.productTitle,
        designName: item.designName,
        items: [item],
        totalQuantity: item.quantity,
        totalPrice: item.pricePerItem * item.quantity,
      });
    }

    return acc;
  }, [] as GroupedCartItem[]);

  const totalQuantity = getTotalQuantity();
  const totalPrice = getTotalPrice();
  const deliveryFee = items.length > 0 ? 3000 : 0;
  const finalTotal = totalPrice + deliveryFee;

  const handleCheckout = () => {
    // TODO: Implement checkout logic
    alert('주문하기 기능은 준비 중입니다.');
  };

  const handleEditDesign = (cartItemId: string) => {
    setSelectedCartItemId(cartItemId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCartItemId(null);
  };

  const handleSaveComplete = () => {
    // Optionally refresh cart items or show success message
    console.log('Design saved successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-50 border-b border-gray-200">
        <Header back={true} />
      </div>

      {/* Page Title */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-black">장바구니</h1>
        {isMounted && (
          <p className="text-sm text-gray-500 mt-1">{totalQuantity}개 상품</p>
        )}
      </div>

      {/* Cart Content */}
      {!isMounted ? (
        // Loading state during hydration
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        // Empty Cart State
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">장바구니가 비어있습니다</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            원하는 상품을 담아보세요
          </p>
          <Link
            href="/home"
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            상품 보러가기
          </Link>
        </div>
      ) : (
        <>
          {/* Cart Items List */}
          <div className="bg-white mb-4">
            {/* Clear All Button */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-600">전체 {groupedItems.length}개 디자인</span>
              <button
                onClick={clearCart}
                className="text-sm text-gray-500 hover:text-red-600 transition flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                전체삭제
              </button>
            </div>

            {/* Grouped Items */}
            <div className="divide-y divide-gray-100">
              {groupedItems.map((group) => (
                <div key={group.savedDesignId} className="p-4">
                  <div className="flex gap-4">
                    {/* Product Thumbnail - Clickable */}
                    <button
                      onClick={() => handleEditDesign(group.items[0].id)}
                      className="w-24 h-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden border border-gray-200 hover:border-gray-400 transition cursor-pointer"
                    >
                      {group.thumbnailUrl ? (
                        <img
                          src={group.thumbnailUrl}
                          alt={group.productTitle}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div
                            className="w-16 h-16 rounded"
                            style={{ backgroundColor: group.items[0].productColor }}
                          />
                        </div>
                      )}
                    </button>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleEditDesign(group.items[0].id)}
                        className="w-full text-left mb-2 cursor-pointer hover:opacity-80 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-black mb-1 truncate">
                              {group.designName || group.productTitle}
                            </h3>
                            {group.designName && (
                              <p className="text-xs text-gray-500 truncate">
                                {group.productTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Options List */}
                      <div className="space-y-2 mb-2">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-gray-500">
                                {item.productColorName} / {item.sizeName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 border border-gray-300 rounded px-1.5 py-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.id, item.quantity - 1);
                                  }}
                                  className="hover:bg-gray-100 rounded"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="min-w-6 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.id, item.quantity + 1);
                                  }}
                                  className="hover:bg-gray-100 rounded"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(item.id);
                                }}
                                className="p-0.5 hover:bg-gray-100 rounded transition text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Price for this design */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600">
                          총 {group.totalQuantity}개
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-black">
                            {group.totalPrice.toLocaleString('ko-KR')}원
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-white p-4 mb-24">
            <h2 className="font-medium text-black mb-3">결제 금액</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">상품 금액</span>
                <span className="text-black">{totalPrice.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">배송비</span>
                <span className="text-black">{deliveryFee.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="h-px bg-gray-200 my-3"></div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-black">총 결제금액</span>
                <span className="text-xl font-bold text-black">
                  {finalTotal.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Fixed Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">총 {totalQuantity}개</p>
              <p className="text-lg font-bold text-black">
                {finalTotal.toLocaleString('ko-KR')}원
              </p>
            </div>
            <button
              onClick={handleCheckout}
              className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              주문하기
            </button>
          </div>
        </div>
      )}

      {/* Design Edit Modal */}
      <DesignEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cartItemId={selectedCartItemId}
        onSaveComplete={handleSaveComplete}
      />
    </div>
  );
}
