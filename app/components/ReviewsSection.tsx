'use client'

import { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import Link from 'next/link';

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  review_image_urls?: string[];
}

interface ReviewsSectionProps {
  productId: string;
  limit?: number;
}

export default function ReviewsSection({ productId, limit = 10 }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews/${productId}?limit=${limit}`);
        const data = await response.json();

        if (data.reviews) {
          setReviews(data.reviews);

          // Calculate average rating
          if (data.reviews.length > 0) {
            const avg = data.reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / data.reviews.length;
            setAverageRating(avg);
          }
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-center text-gray-500">리뷰를 불러오는 중...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold mb-2">고객 리뷰</h3>
        <p className="text-gray-500">아직 리뷰가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">고객 리뷰</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center text-orange-400">
              <FaStar />
              <span className="ml-1 font-semibold">{averageRating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-500">({reviews.length}개의 리뷰)</span>
          </div>
        </div>
        <Link
          href={`/reviews/${productId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          전체 보기
        </Link>
      </div>

      {/* Reviews List */}
      <div className="space-y-4 flex overflow-auto gap-2">
        {reviews.slice(0, limit).map((review) => (
          <div key={review.id} className="last:border-b-0 w-75 shrink-0 bg-gray-50 p-2 rounded-lg">
            {/* Rating and Author */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex text-orange-400">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={i < review.rating ? 'text-orange-400' : 'text-gray-300'}
                      size={14}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{review.author_name}</span>
              </div>
              <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
            </div>

            {/* Review Title */}
            <h4 className="font-semibold text-sm mb-1">{review.title}</h4>

            {/* Review Content */}
            <p className="text-sm text-gray-700 mb-2">{review.content}</p>

            {/* Review Images */}
            {review.review_image_urls && review.review_image_urls.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {review.review_image_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`리뷰 이미지 ${idx + 1}`}
                    className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(url)}
                  />
                ))}
              </div>
            )}

            {/* Helpful Count */}
            {review.helpful_count > 0 && (
              <p className="text-xs text-gray-500">도움이 됨 {review.helpful_count}</p>
            )}
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-gray-300"
              aria-label="닫기"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="리뷰 이미지"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}