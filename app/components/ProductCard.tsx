'use client';

import { Heart, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/types";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { useAuthStore } from "@/store/useAuthStore";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = product.base_price.toLocaleString('ko-KR');
  const firstSideImage = product.configuration[0]?.imageUrl;
  const { user, isAuthenticated } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if product is favorited
  useEffect(() => {
    async function checkFavorite() {
      if (!isAuthenticated || !user) {
        setIsFavorited(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking favorite:', error);
        }

        setIsFavorited(!!data);
      } catch (error) {
        console.error('Error checking favorite:', error);
      }
    }

    checkFavorite();
  }, [isAuthenticated, user, product.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) throw error;
        setIsFavorited(false);
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: product.id,
          });

        if (error) throw error;
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/editor/${product.id}`} className="bg-white rounded-sm overflow-hidden shadow-sm">
      {/* Product Image */}
      <div className="aspect-4/5 bg-gray-100 relative">
        {firstSideImage && (
          <Image
            src={firstSideImage}
            alt={product.title}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        )}
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isLoading}
          className="absolute right-2 bottom-2 p-2 bg-white rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Heart
            size={18}
            className={isFavorited ? "fill-red-500 text-red-500" : ""}
          />
        </button>
      </div>
      {/* Product Details */}
      <div className="p-2">
        {/* Category */}
        {product.category && (
          <p className="text-black text-xs font-bold capitalize">{product.category}</p>
        )}
        {/* Product Name */}
        <p className="text-sm">{product.title}</p>
        {/* Pricing */}
        <p className="font-bold">{formattedPrice}원</p>
        <p className="text-xs">200개 이상 구매시</p>
        <div className="text-[.6em] flex items-center gap-0.5">
          <Star size={10} className="text-orange-400"/>
          <p className="text-orange-400 text-bold">4.92</p>
          <p className="text-gray-400 text-[.5em]">(999+)</p>
        </div>
      </div>
    </Link>
  )
}