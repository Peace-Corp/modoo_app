import { Heart, Star } from "lucide-react";
import Link from "next/link";

export default function ProductCard() {
  return (
    <Link href={'editor/1'} className="bg-white rounded-sm overflow-hidden shadow-sm">
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
    </Link>
  )
}