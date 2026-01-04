'use client';

import { useSearchParams } from 'next/navigation';
import ReviewsPageClient from './ReviewsPageClient';

export default function ReviewsMobilePage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || '';

  return <ReviewsPageClient productId={productId} />;
}
