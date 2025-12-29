'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import PricingInfo from "@/app/components/canvas/PricingInfo";
import ColorInfo from "@/app/components/canvas/ColorInfo";
import { Product, ProductConfig, CartItem, ProductColor } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useCartStore } from "@/store/useCartStore";
import Header from "@/app/components/Header";
import { Share } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { useState, useMemo, useEffect } from "react";
import { calculateAllSidesPricing } from "@/app/utils/canvasPricing";
import { SavedDesign } from "@/lib/designService";
import { addToCartDB } from "@/lib/cartService";
import SavedDesignsModal from "@/app/components/SavedDesignsModal";
import { generateProductThumbnail } from "@/lib/thumbnailGenerator";
import QuantitySelectorModal from "@/app/components/QuantitySelectorModal";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import ReviewsSection from "@/app/components/ReviewsSection";

interface ProductEditorClientProps {
  product: Product;
}

export default function ProductEditorClient({ product }: ProductEditorClientProps) {
  const searchParams = useSearchParams();
  const cartItemId = searchParams.get('cartItemId');

  const {
    isEditMode,
    productColor,
    setProductColor,
    saveAllCanvasState,
    restoreAllCanvasState,
    canvasMap,
    canvasVersion,
    incrementCanvasVersion,
  } = useCanvasStore();

  const { addItem: addToCart, items: cartStoreItems } = useCartStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuantitySelectorOpen, setIsQuantitySelectorOpen] = useState(false);
  const [, setIsLoadingCartItem] = useState(false);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);

  // Convert Product to ProductConfig format
  const productConfig: ProductConfig = {
    productId: product.id,
    sides: product.configuration,
  };

  const handleColorChange = (color: string) => {
    setProductColor(color);
  };

  // Open quantity selector modal
  const handleAddToCartClick = () => {
    setIsQuantitySelectorOpen(true);
  };

  // Save design to cart and clear state
  const handleSaveToCart = async (designName: string, selectedItems: CartItem[]) => {
    setIsSaving(true);
    try {
      const canvasState = saveAllCanvasState();
      const thumbnail = generateProductThumbnail(canvasMap, 'front', 200, 200);
      const previewImage = generateProductThumbnail(canvasMap, 'front', 400, 400);
      const colorName = productColors.find(c => c.hex === productColor)?.name || '색상';

      // Save design once and reuse for all cart items
      let sharedDesignId: string | undefined;

      // Add all cart items to both Supabase and local storage
      for (const item of selectedItems) {
        // Save to Supabase - first item creates the design, rest reuse it
        const dbCartItem = await addToCartDB({
          productId: product.id,
          productTitle: product.title,
          productColor: productColor,
          productColorName: colorName,
          sizeId: item.sizeId,
          sizeName: item.sizeName,
          quantity: item.quantity,
          pricePerItem: pricePerItem,
          canvasState: canvasState,
          thumbnailUrl: thumbnail,
          savedDesignId: sharedDesignId, // Reuse design for subsequent items
          designName: designName, // Use the custom design name
          previewImage: previewImage, // Add preview image for the design
        });

        // Store the design ID from the first item
        if (!sharedDesignId && dbCartItem?.saved_design_id) {
          sharedDesignId = dbCartItem.saved_design_id;
        }

        // Also add to local cart store for offline access
        addToCart({
          productId: product.id,
          productTitle: product.title,
          productColor: productColor,
          productColorName: colorName,
          sizeId: item.sizeId,
          sizeName: item.sizeName,
          quantity: item.quantity,
          pricePerItem: pricePerItem,
          canvasState: canvasState,
          thumbnailUrl: thumbnail,
          savedDesignId: sharedDesignId, // All items share the same design ID
          designName: designName, // Custom design name
        });
      }

      // Clear canvas state
      Object.values(canvasMap).forEach((canvas) => {
        const objectsToRemove = canvas.getObjects().filter(obj => {
          // Keep guide boxes and snap lines
          if (obj.excludeFromExport) return false;

          // Keep the background product image by checking its ID
          // @ts-expect-error - Checking custom data property
          if (obj.data?.id === 'background-product-image') return false;

          // Remove all other user-added objects
          return true;
        });
        objectsToRemove.forEach(obj => canvas.remove(obj));
        canvas.requestRenderAll();
      });

      // Reset product color to default
      setProductColor('#FFFFFF');
    } catch (error) {
      console.error('Add to cart failed:', error);
      alert('장바구니 추가 중 오류가 발생했습니다.');
      throw error; // Re-throw to prevent success modal from showing
    } finally {
      setIsSaving(false);
    }
  };

  // Load design from Supabase
  const handleLoadDesign = async (design: SavedDesign) => {
    try {
      // Restore product color FIRST, before canvas state
      // This ensures the color filter is applied when the canvas objects are restored
      const colorSelections = design.color_selections as { productColor?: string } | null;
      if (colorSelections?.productColor) {
        setProductColor(colorSelections.productColor);
      }

      // Wait a brief moment for the color to be applied to all canvases
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then restore canvas state
      await restoreAllCanvasState(design.canvas_state as Record<string, string>);

      alert('디자인이 성공적으로 불러와졌습니다!');
    } catch (error) {
      console.error('Failed to load design:', error);
      alert('디자인 불러오기에 실패했습니다.');
    }
  };

  // Fetch product colors from database
  useEffect(() => {
    const fetchColors = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('product_colors')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Failed to fetch product colors:', error);
        return;
      }

      if (data && data.length > 0) {
        setProductColors(data as ProductColor[]);
      }
    };

    fetchColors();
  }, [product.id]);

  // Load cart item design on mount if cartItemId is provided
  useEffect(() => {
    const loadCartItemDesign = async () => {
      if (!cartItemId) return;

      // Find the cart item
      const cartItem = cartStoreItems.find(item => item.id === cartItemId);
      if (!cartItem) {
        console.error('Cart item not found:', cartItemId);
        return;
      }

      setIsLoadingCartItem(true);
      try {
        // Wait for canvases to be registered
        // Check if all canvases are ready
        const checkCanvasesReady = () => {
          return product.configuration.every(side => canvasMap[side.id]);
        };

        // Poll until canvases are ready (with timeout)
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        while (!checkCanvasesReady() && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!checkCanvasesReady()) {
          console.error('Canvases not ready after timeout');
          return;
        }

        // Restore product color FIRST
        if (cartItem.productColor) {
          setProductColor(cartItem.productColor);
        }

        // Wait for color to be applied
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then restore canvas state
        await restoreAllCanvasState(cartItem.canvasState);

        // Increment canvas version to trigger pricing recalculation
        incrementCanvasVersion();

        console.log('Cart item design loaded successfully');
      } catch (error) {
        console.error('Failed to load cart item design:', error);
      } finally {
        setIsLoadingCartItem(false);
      }
    };

    loadCartItemDesign();
  }, [cartItemId, cartStoreItems, canvasMap, product.configuration, restoreAllCanvasState, setProductColor, incrementCanvasVersion]);

  const formattedPrice = product.base_price.toLocaleString('ko-KR');

  // Calculate price per item including canvas design costs
  const pricingData = useMemo(() => {
    return calculateAllSidesPricing(canvasMap, product.configuration);
  }, [canvasMap, product.configuration, canvasVersion]);

  const pricePerItem = product.base_price + pricingData.totalAdditionalPrice;

  return (
    <div className="">

      {/* Header */}
        {!isEditMode && (
          <div className="w-full sticky top-0 bg-gray-300 z-50">
            <Header back={true} />
          </div>
          )
        }

      {/* The actual product designer component */}
      <ProductDesigner config={productConfig} />


      {/* Product Details */}
      {!isEditMode && (
        <div className="text-black bg-white p-4 mb-24 flex flex-col gap-1 pb-100">
          {/* First Section */}
          <div className="w-full flex justify-between">
            <div className="">
              <h2 className="text-xs font-bold">{product.category || '카테고리'}</h2>
              <p className="text-black font-normal">{product.title}</p>
            </div>
            <div>
              <Share />
            </div>
          </div>
          {/* Price and Delivery Section */}
          <div className="w-full flex justify-between">
            <p className="text-sm text-black">1개당 <span className="font-bold">{formattedPrice}원</span></p>
            <p className="text-sm text-black/80">배송비 3,000원</p>
          </div>
          {/* Reviews Section */}
          <div className="flex gap-2 text-[.8em]">
            <p className="text-orange-300 flex items-center gap-1"><span><FaStar /></span>4.9</p>
            <p className="underline">리뷰 46</p>
          </div>



          {/* Horizontal Color Selector */}
          <div className="mt-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 pb-2">
              {productColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorChange(color.hex)}
                  className="shrink-0 flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 ${
                      productColor === color.hex ? 'border-black' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  ></div>
                  <span className="text-xs">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Pricing Info */}
          <PricingInfo basePrice={product.base_price} sides={product.configuration} />

          {/* Color Information */}
          <ColorInfo className="mt-4" />

          {/* Reviews Section */}
          <ReviewsSection productId={product.id} limit={10} />
        </div>
      )}


      {/* Bottom Bar */}
      {!isEditMode && (
        <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-3 px-4 shadow-2xl shadow-black">
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleAddToCartClick}
              disabled={isSaving}
              className="w-full bg-black py-3 text-sm rounded-lg text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isSaving ? '처리 중...' : '장바구니에 담기'}
            </button>
            <EditButton className="w-full"/>
          </div>
        </div>
      )}

      {/* Quantity Selector Modal */}
      <QuantitySelectorModal
        isOpen={isQuantitySelectorOpen}
        onClose={() => setIsQuantitySelectorOpen(false)}
        onConfirm={handleSaveToCart}
        sizeOptions={product.size_options || []}
        pricePerItem={pricePerItem}
        isSaving={isSaving}
      />

      {/* Saved Designs Modal */}
      <SavedDesignsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectDesign={handleLoadDesign}
      />

    </div>



  )
}