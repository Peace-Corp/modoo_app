'use client'

import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { ReviewWithProduct } from '@/types/types';

interface BestReviewsSectionProps {
  reviews: ReviewWithProduct[];
}

export default function BestReviewsSection({ reviews }: BestReviewsSectionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900">BEST 후기</h2>
      </div>

      {/* Reviews horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="flex-shrink-0 w-[200px] lg:w-auto bg-gray-50 rounded-lg overflow-hidden"
          >
            {/* Review Image */}
            {review.review_image_urls && review.review_image_urls.length > 0 && (
              <div
                className="relative w-full aspect-square cursor-pointer"
                onClick={() => setSelectedImage(review.review_image_urls[0])}
              >
                <Image
                  src={review.review_image_urls[0]}
                  alt="리뷰 이미지"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 1024px) 200px, 20vw"
                />
              </div>
            )}

            {/* Review Info */}
            <div className="p-3">
              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={i < review.rating ? 'text-orange-400' : 'text-gray-300'}
                    size={12}
                  />
                ))}
              </div>

              {/* Review Content Preview */}
              <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                {review.content}
              </p>

              {/* Product Link */}
              {review.product && (
                <Link
                  href={`/product/${review.product.id}`}
                  className="flex items-center gap-2 mt-2 group"
                >
                  {review.product.thumbnail_image_link && (
                    <div className="relative w-8 h-8 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                      <Image
                        src={review.product.thumbnail_image_link}
                        alt={review.product.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                  )}
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 truncate">
                    {review.product.title}
                  </span>
                </Link>
              )}
            </div>
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
    </section>
  );
}
