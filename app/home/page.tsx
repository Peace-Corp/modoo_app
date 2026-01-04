'use client';

import { useEffect, useState } from 'react';
import Header from '@/app/components/Header';
import HeroBanner from '@/app/components/HeroBanner';
import ProductCard from '../components/ProductCard';
import CategoryButton from '@/app/components/CategoryButton';
import ProductionExamples from '@/app/components/ProductionExamples';
import InquiryBoardSection from '@/app/components/InquiryBoardSection';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-client';
import { Product } from '@/types/types';
import { CATEGORIES } from '@/lib/categories';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching products:', error);
          return;
        }

        setProducts((data ?? []) as Product[]);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header showHomeNav />
      <div className="lg:pt-6 py-4 flex flex-col lg:flex-row lg:gap-6 lg:items-start">
        <div className="w-full lg:w-[78%] lg:shrink-0">
          <HeroBanner />
        </div>

        <section className="w-full lg:w-[22%] mt-4 lg:mt-0 px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">카테고리</h2>
          <CategoriesSection />
        </section>
      </div>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 lg:space-y-8 py-4 lg:py-6">
        <section className="w-full">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">인기 급상승</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-sm lg:text-base text-gray-500">
                상품이 없습니다
              </div>
            )}
          </div>
        </section>

        <ProductionExamples />

        <div id="reviews"></div>
        <InquiryBoardSection />
      </main>
    </div>
  );
}

function CategoriesSection() {
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:gap-1.5 lg:overflow-visible">
        {CATEGORIES.map((category) => (
          <CategoryButton
            key={category.key}
            name={category.name}
            icon={category.icon}
            href={`/home/search?category=${encodeURIComponent(category.key)}`}
          />
        ))}
      </div>
    </div>
  );
}
