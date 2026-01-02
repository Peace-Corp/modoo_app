'use client';

import { Heart, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/types";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { useAuthStore } from "@/store/useAuthStore";
import LoginPromptModal from "./LoginPromptModal";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = product.base_price.toLocaleString('ko-KR');
  const firstSideImage = product.thumbnail_image_link;
  const { user, isAuthenticated } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reviewStats, setReviewStats] = useState<{
    averageRating: number;
    totalReviews: number;
  }>({ averageRating: 0, totalReviews: 0 });

  // Fetch review statistics
  useEffect(() => {
    async function fetchReviewStats() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('reviews')
          .select('rating')
          .eq('product_id', product.id);

        if (error) {
          console.error('Error fetching reviews:', error);
          return;
        }

        if (data && data.length > 0) {
          const totalReviews = data.length;
          const averageRating = data.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
          setReviewStats({
            averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
            totalReviews,
          });
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      }
    }

    fetchReviewStats();
  }, [product.id]);

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
          .maybeSingle();

        if (error) {
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
      setShowLoginModal(true);
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
    <>
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
          {/* Reviews */}
          {reviewStats.totalReviews > 0 ? (
            <div className="text-[.6em] flex items-center gap-0.5">
              <Star size={10} className="text-orange-400 fill-orange-400"/>
              <p className="text-orange-400 font-bold">{reviewStats.averageRating.toFixed(2)}</p>
              <p className="text-gray-400 text-[.5em]">({reviewStats.totalReviews}{reviewStats.totalReviews >= 100 ? '+' : ''})</p>
            </div>
          ) : (
            <div className="text-[.6em] flex items-center gap-0.5">
              <Star size={10} className="text-gray-300"/>
              <p className="text-gray-400 text-[.5em]">리뷰 없음</p>
            </div>
          )}
        </div>
      </Link>

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="찜하기 기능을 사용하려면 로그인이 필요합니다."
      />
    </>
  )
}