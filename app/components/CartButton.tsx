'use client';

import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";

export default function CartButton() {
  const totalQuantity = useCartStore((state) => state.getTotalQuantity());

  return (
    <Link href="/cart" className="relative">
      <ShoppingBasket className="text-gray-700 size-6"/>
      {totalQuantity > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {totalQuantity > 99 ? '99+' : totalQuantity}
        </div>
      )}
    </Link>
  )
}