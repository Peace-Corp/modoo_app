'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import DesignEditModal from '@/app/components/DesignEditModal';
import FavoritesList from '@/app/components/FavoritesList';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';

type TabType = 'designs' | 'favorites';

interface SavedDesign {
  id: string;
  title: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    title: string;
    base_price: number;
  };
  color_selections: Record<string, Record<string, string>>;
}

export default function DesignsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('designs');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch designs from database
  useEffect(() => {
    async function fetchDesigns() {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('saved_designs')
          .select(`
            id,
            title,
            preview_url,
            created_at,
            updated_at,
            color_selections,
            product:products (
              id,
              title,
              base_price
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setDesigns(data || []);
      } catch (err) {
        console.error('Error fetching designs:', err);
        setError('디자인을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDesigns();
  }, [isAuthenticated, user]);

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
          {!isAuthenticated ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">로그인이 필요합니다</p>
              <p className="text-sm text-gray-400 mb-6">나의 디자인을 확인하려면 로그인해주세요</p>
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                로그인하기
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-gray-500 mt-4">디자인을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">저장된 디자인이 없습니다</p>
              <p className="text-sm text-gray-400">제품을 커스터마이징하고 장바구니에 담아보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {designs.map((design) => {
                return (
                  <button
                    key={design.id}
                    onClick={() => handleDesignClick(design.id)}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-gray-100 relative">
                      {design.preview_url ? (
                        <Image
                          src={design.preview_url}
                          alt={design.title || design.product.title}
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
                    <div className="p-3 flex flex-col">
                      {design.title && (
                        <p className="text-xs text-gray-500 truncate text-left">
                          {design.product.title}
                        </p>
                      )}
                      <h3 className="font-bold text-md mb-1 text-left truncate">
                        {design.title || design.product.title}
                      </h3>

                      {/* Price */}
                      <p className="text-sm font-bold text-left">
                        ₩{design.product.base_price.toLocaleString()}
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