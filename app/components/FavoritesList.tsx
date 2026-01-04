'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/store/useAuthStore';
import ProductCard from '@/app/components/ProductCard';
import { Product } from '@/types/types';

export default function FavoritesList() {
  const { user, isAuthenticated } = useAuthStore();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      if (!isAuthenticated || !user) {
        setFavoriteProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Fetch favorites with product details
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            id,
            created_at,
            products (
              id,
              title,
              base_price,
              configuration,
              category,
              is_active,
              size_options,
              thumbnail_image_link
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching favorites:', error);
          return;
        }

        // Transform the data to Product[] format
        const products = data
          ?.map((item: any) => item.products)
          .filter((product: any) => product && product.is_active) as Product[];

        setFavoriteProducts(products || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavorites();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">로그인이 필요합니다</p>
        <p className="text-sm text-gray-400">로그인 후 찜한 상품을 확인하세요!</p>
      </div>
    );
  }

  if (favoriteProducts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">찜한 상품이 없습니다</p>
        <p className="text-sm text-gray-400">마음에 드는 상품을 찜해보세요!</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {favoriteProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
