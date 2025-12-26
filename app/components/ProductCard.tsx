import { Heart, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = product.base_price.toLocaleString('ko-KR');
  const firstSideImage = product.configuration[0]?.imageUrl;

  return (
    <Link href={`/editor/${product.id}`} className="bg-white rounded-sm overflow-hidden shadow-sm">
      {/* Product Image */}
      <div className="aspect-4/5 bg-gray-100 relative">
        {firstSideImage && (
          <Image
            src={firstSideImage}
            alt={product.title}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        )}
        <button className="absolute right-2 bottom-2 p-2 bg-white rounded-full hover:bg-gray-50 transition-colors">
          <Heart size={18}/>
        </button>
      </div>
      {/* Product Details */}
      <div className="p-2">
        {/* Category */}
        {product.category && (
          <p className="text-black text-xs font-bold capitalize">{product.category}</p>
        )}
        {/* Product Name */}
        <p className="text-sm">{product.title}</p>
        {/* Pricing */}
        <p className="font-bold">{formattedPrice}원</p>
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