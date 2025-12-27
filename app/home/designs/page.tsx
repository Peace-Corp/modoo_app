'use client';

import { useState } from 'react';
import { useCartStore, CartItemData } from '@/store/useCartStore';
import DesignEditModal from '@/app/components/DesignEditModal';
import FavoritesList from '@/app/components/FavoritesList';
import Image from 'next/image';

// Mock color list with hex codes
const mockColors = [
  { id: 'white', name: '화이트', hex: '#FFFFFF' },
  { id: 'mix-gray', name: '믹스그레이', hex: '#9CA3AF' },
  { id: 'black', name: '블랙', hex: '#000000' },
  { id: 'navy', name: '네이비', hex: '#1E3A8A' },
  { id: 'red', name: '레드', hex: '#EF4444' },
  { id: 'pink', name: '핑크', hex: '#F9A8D4' },
  { id: 'green', name: '그린', hex: '#22C55E' },
  { id: 'yellow', name: '옐로우', hex: '#FACC15' },
];

type TabType = 'designs' | 'favorites';

export default function DesignsPage() {
  const { items } = useCartStore();
  const [activeTab, setActiveTab] = useState<TabType>('designs');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group items by savedDesignId to show unique designs
  const uniqueDesigns = items.reduce((acc, item) => {
    if (item.savedDesignId && !acc.some(d => d.savedDesignId === item.savedDesignId)) {
      acc.push(item);
    }
    return acc;
  }, [] as CartItemData[]);

  const handleDesignClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItemId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">나의 디자인</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('designs')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'designs'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500'
            }`}
          >
            나의 디자인
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500'
            }`}
          >
            찜한 상품
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'designs' ? (
        <div className="p-4">
          {uniqueDesigns.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">저장된 디자인이 없습니다</p>
              <p className="text-sm text-gray-400">제품을 커스터마이징하고 장바구니에 담아보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {uniqueDesigns.map((item) => {
                const colorInfo = mockColors.find(c => c.hex === item.productColor);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleDesignClick(item.id)}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-gray-100 relative">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-400">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm mb-2 text-left truncate">
                        {item.productTitle}
                      </h3>

                      {/* Color Options */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{ backgroundColor: item.productColor }}
                        />
                        <span className="text-xs text-gray-600">
                          {colorInfo?.name || item.productColorName}
                        </span>
                      </div>

                      {/* Price */}
                      <p className="text-sm font-bold text-left">
                        ₩{item.pricePerItem.toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <FavoritesList />
      )}

      {/* Design Edit Modal */}
      <DesignEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cartItemId={selectedItemId}
        onSaveComplete={() => {
          // Refresh the page to show updated design
          window.location.reload();
        }}
      />
    </div>
  );
}