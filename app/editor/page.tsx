'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Product } from '@/types/types';
import { isNative } from '@/lib/platform';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import ProductEditorClient from './components/ProductEditorClient';
import ProductEditorClientDesktop from './components/ProductEditorClientDesktop';

export default function ProductEditorMobilePage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || '';
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching product:', error);
          setProduct(null);
        } else {
          setProduct(data as Product);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const shouldUseMobileEditor = useMemo(() => {
    if (isNative()) return true;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1024px)').matches;
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!productId || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">상품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return shouldUseMobileEditor
    ? <ProductEditorClient product={product} />
    : <ProductEditorClientDesktop product={product} />;
}
