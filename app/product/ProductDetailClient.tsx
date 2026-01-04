'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-client';
import { Product } from '@/types/types';
import { routes } from '@/lib/routes';

interface ProductDetailClientProps {
  productId: string;
}

export default function ProductDetailClient({ productId }: ProductDetailClientProps) {
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header back={true} />
        <div className="max-w-xl mx-auto px-4 py-12 text-center text-gray-500">
          상품을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header back={true} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
          {product.category && (
            <p className="text-sm text-gray-500 mb-4">{product.category}</p>
          )}
          <p className="text-lg font-semibold text-gray-900 mb-6">
            {product.base_price.toLocaleString('ko-KR')}원
          </p>
          <Link
            href={routes.editor(product.id)}
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
          >
            디자인 시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
