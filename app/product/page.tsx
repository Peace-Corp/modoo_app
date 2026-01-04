'use client';

import { useSearchParams } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

export default function ProductDetailMobilePage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id') || searchParams.get('productId') || '';

  return <ProductDetailClient productId={productId} />;
}
