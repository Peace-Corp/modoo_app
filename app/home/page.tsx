import Header from "@/app/components/Header";
import HeroBanner from "../components/HeroBanner";
import ProductCard from "../components/ProductCard";
import { Heart, Star } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 space-y-2">
      {/* Header */}
      <Header />

      {/* Hero Banner */}
      {/* this will only be used in the home screen */}
      <HeroBanner />

      {/* Categories */}
      <CategoriesSection />

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-black font-bold">인기 급상승</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div className="bg-white rounded-sm overflow-hidden shadow-sm" key={i}>
              {/* Product Image */}
              <div className="aspect-4/5 bg-gray-300 animate-pulse relative">
                <button className="absolute right-2 bottom-2 p-2 bg-white rounded-full">
                  <Heart size={18}/>
                </button>
              </div>
              {/* Product Details */}
              <div className="p-2">
                {/* Brand Name */}
                <p className="text-black text-xs font-bold">발렌시아가</p>
                {/* Product Name */}
                <p className="text-sm">티셔츠</p>
                {/* Pricing */}
                <p className="font-bold">20,000원</p>
                <p className="text-xs">200개 이상 구매시</p>
                <div className="text-[.6em] flex items-center gap-0.5">
                  <Star size={10} className="text-orange-400"/>
                  <p className="text-orange-400 text-bold">4.92</p>
                  <p className="text-gray-400 text-[.5em]">(999+)</p>
                </div>
              </div>
            </div>
          ))}
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
  const categories = [
    "의류",
    "신발",
    "가방",
    "액세서리",
    "뷰티",
    "스포츠",
    "전자제품",
    "가구"
  ];

  return (
    <section className="max-w-7xl mx-auto pt-5">
        <div className="flex gap-4 overflow-x-auto px-4">
          {categories.map((category, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="size-16 bg-gray-300 rounded-full" />
              <p className="text-sm text-gray-700">{category}</p>
            </div>
          ))}
        </div>
      </section>
  )
}
