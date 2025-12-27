import Header from "@/app/components/Header";
import HeroBanner from "@/app/components/HeroBanner";
import ProductCard from "../components/ProductCard"
import CategoryButton from "@/app/components/CategoryButton";
import { createClient } from "@/lib/supabase";
import { Product } from "@/types/types";
import { CATEGORIES } from "@/lib/categories";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 space-y-2">
      {/* Header */}
      <Header />

      {/* Hero Banner */}
      {/* this will only be used in the home screen */}
      <HeroBanner />

      {/* Categories */}
      <div className="w-full pt-2">
        <h2 className="px-4 font-bold">카테고리</h2>
        <CategoriesSection />
      </div>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-black font-bold">인기 급상승</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {products && products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product as Product}/>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              상품이 없습니다
            </div>
          )}
        </div>
      </section>

      {/* Deals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-300 rounded animate-pulse" />
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-video bg-linear-to-br from-gray-200 to-gray-300 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-full bg-red-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brands Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 w-56 bg-gray-300 rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 flex items-center justify-center">
              <div className="h-16 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-5 w-32 bg-gray-700 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse mx-auto" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategoriesSection() {
  return (
    <section className="max-w-7xl mx-auto py-2">
        <div className="flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map((category) => (
            <CategoryButton
              key={category.key}
              name={category.name}
              icon={category.icon}
              href={`/home/search?category=${encodeURIComponent(category.key)}`}
            />
          ))}
        </div>
      </section>
  )
}
