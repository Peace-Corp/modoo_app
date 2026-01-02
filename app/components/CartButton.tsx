'use client';

import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import LoginPromptModal from "./LoginPromptModal";

export default function CartButton() {
  const [mounted, setMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const items = useCartStore((state) => state.items);
  const setItems = useCartStore((state) => state.setItems);
  const clearCart = useCartStore((state) => state.clearCart);
  const { isAuthenticated, user } = useAuthStore();

  // Count unique designs based on savedDesignId
  const uniqueDesignCount = items.reduce((acc, item) => {
    if (item.savedDesignId && !acc.includes(item.savedDesignId)) {
      acc.push(item.savedDesignId);
    }
    return acc;
  }, [] as string[]).length;

  // Sync cart with auth state: fetch items on login, clear on logout
  useEffect(() => {
    async function syncCart() {
      // User logged out - clear the cart
      if (!isAuthenticated || !user) {
        clearCart();
        return;
      }

      // User logged in - fetch cart items from database
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching cart items:', error);
          return;
        }

        if (data) {
          // Transform database cart items to match CartItemData interface
          const cartItems = data.map((item) => ({
            id: item.id,
            productId: item.product_id || '',
            productTitle: item.product_title,
            productColor: item.product_color,
            productColorName: item.product_color_name,
            sizeId: item.size_id,
            sizeName: item.size_name,
            quantity: item.quantity,
            pricePerItem: Number(item.price_per_item),
            canvasState: {}, // Canvas state is stored in saved_designs, not cart_items
            thumbnailUrl: item.thumbnail_url || undefined,
            addedAt: new Date(item.created_at).getTime(),
            savedDesignId: item.saved_design_id || undefined,
            designName: undefined, // Not stored in cart_items table
          }));

          setItems(cartItems);
        }
      } catch (err) {
        console.error('Error fetching cart items:', err);
      }
    }

    syncCart();
  }, [isAuthenticated, user, setItems, clearCart]);

  // Only render cart count after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCartClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  return (
    <>
      {isAuthenticated ? (
        <Link href="/cart" className="relative">
          <ShoppingBasket className="text-gray-700 size-6"/>
          {mounted && uniqueDesignCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {uniqueDesignCount > 99 ? '99+' : uniqueDesignCount}
            </div>
          )}
        </Link>
      ) : (
        <button onClick={handleCartClick} className="relative">
          <ShoppingBasket className="text-gray-700 size-6"/>
        </button>
      )}

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="장바구니 기능을 사용하려면 로그인이 필요합니다."
      />
    </>
  )
}