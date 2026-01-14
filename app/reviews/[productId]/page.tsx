'use client'

import { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { useParams } from 'next/navigation';
import Header from '@/app/components/Header';

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

export default function ReviewsPage() {
  const params = useParams();
  const productId = params?.productId as string;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews/${productId}`);
        const data = await response.json();

        if (data.reviews) {
          setReviews(data.reviews);

          // Calculate average rating
          if (data.reviews.length > 0) {
            const avg = data.reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / data.reviews.length;
            setAverageRating(avg);

            // Calculate rating distribution
            const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            data.reviews.forEach((review: Review) => {
              distribution[review.rating]++;
            });
            setRatingDistribution(distribution);
          }
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getPercentage = (count: number) => {
    if (reviews.length === 0) return 0;
    return Math.round((count / reviews.length) * 100);
  };

  const maskAuthorName = (name: string) => {
    if (!name || name.length <= 1) return name;
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-50 border-b border-gray-200">
        <Header back={true} />
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Title */}
        <h1 className="text-2xl font-bold mb-6">고객 리뷰</h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">리뷰를 불러오는 중...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">아직 리뷰가 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Rating Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-8">
                {/* Average Rating */}
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
                  <div className="flex text-orange-400 mb-2 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={i < Math.round(averageRating) ? 'text-orange-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">{reviews.length}개의 리뷰</div>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1 w-12">
                        <FaStar className="text-orange-400" size={14} />
                        <span className="text-sm">{rating}</span>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-400 h-2 rounded-full"
                          style={{ width: `${getPercentage(ratingDistribution[rating])}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {getPercentage(ratingDistribution[rating])}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  {/* Rating and Author */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex text-orange-400">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={i < review.rating ? 'text-orange-400' : 'text-gray-300'}
                            size={16}
                          />
                        ))}
                      </div>
                      <span className="font-medium">{maskAuthorName(review.author_name)}</span>
                      {review.is_verified_purchase && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          구매확인
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                  </div>

                  {/* Review Title */}
                  <h3 className="font-semibold text-lg mb-2">{review.title}</h3>

                  {/* Review Content */}
                  <p className="text-gray-700 mb-3 leading-relaxed">{review.content}</p>

                  {/* Helpful Count */}
                  {review.helpful_count > 0 && (
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-3 py-1">
                        도움이 됨 ({review.helpful_count})
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
