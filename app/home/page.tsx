import Header from "@/app/components/Header";
import HeroBanner from "@/app/components/HeroBanner";
import ProductCard from "../components/ProductCard"
import CategoryButton from "@/app/components/CategoryButton";
import ProductionExamples from "@/app/components/ProductionExamples";
import InquiryBoardSection from "@/app/components/InquiryBoardSection";
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
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <Header showHomeNav />

      <div className="lg:pt-5 py-4">
        <HeroBanner />
      </div>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-2 lg:space-y-4">
        {/* Hero Banner */}
        {/* this will only be used in the home screen */}

        {/* Categories */}
        <section className="w-full">
          <h2 className="text-base lg:text-lg font-bold text-gray-900">카테고리</h2>
          <CategoriesSection />
        </section>

        {/* Featured Products Section */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-3 lg:mb-5">
            <p className="text-base lg:text-lg font-bold text-gray-900">인기 급상승</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
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
        
        {/* Production Examples Section */}
        <ProductionExamples />

        {/* Inquiry Board Section */}
        <div id="reviews"></div>
        <InquiryBoardSection />
      </main>
    </div>
  );
}

function CategoriesSection() {
  return (
    <div className="mt-2">
      <div className="flex gap-2 overflow-x-auto pb-2 ">
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
  )
}
