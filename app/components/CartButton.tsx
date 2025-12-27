'use client';

import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { useEffect, useState } from "react";

export default function CartButton() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);

  // Count unique designs based on savedDesignId
  const uniqueDesignCount = items.reduce((acc, item) => {
    if (item.savedDesignId && !acc.includes(item.savedDesignId)) {
      acc.push(item.savedDesignId);
    }
    return acc;
  }, [] as string[]).length;

  // Only render cart count after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/cart" className="relative">
      <ShoppingBasket className="text-gray-700 size-6"/>
      {mounted && uniqueDesignCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {uniqueDesignCount > 99 ? '99+' : uniqueDesignCount}
        </div>
      )}
    </Link>
  )
}