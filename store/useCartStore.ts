import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemData {
  id: string; // Unique identifier for this cart item
  productId: string;
  productTitle: string;
  productColor: string;
  productColorName: string;
  sizeId: string;
  sizeName: string;
  quantity: number;
  pricePerItem: number; // Base price + design costs
  canvasState: Record<string, string>; // Serialized canvas state for each side
  thumbnailUrl?: string; // Optional thumbnail image
  addedAt: number; // Timestamp
  savedDesignId?: string; // Reference to the saved design in Supabase
}

interface CartState {
  items: CartItemData[];

  // Add item to cart
  addItem: (item: Omit<CartItemData, 'id' | 'addedAt'>) => void;

  // Remove item from cart
  removeItem: (itemId: string) => void;

  // Update item quantity
  updateQuantity: (itemId: string, quantity: number) => void;

  // Clear entire cart
  clearCart: () => void;

  // Get total quantity
  getTotalQuantity: () => number;

  // Get total price
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const newItem: CartItemData = {
          ...item,
          id: `${item.productId}-${item.sizeId}-${Date.now()}`,
          addedAt: Date.now(),
        };

        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalQuantity: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.pricePerItem * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage', // localStorage key
    }
  )
);
