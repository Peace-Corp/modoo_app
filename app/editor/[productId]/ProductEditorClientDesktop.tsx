'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import PricingInfo from "@/app/components/canvas/PricingInfo";
import ColorInfo from "@/app/components/canvas/ColorInfo";
import LayerColorSelector from "@/app/components/canvas/LayerColorSelector";
import ObjectPreviewPanel from "@/app/components/canvas/ObjectPreviewPanel";
import { Product, ProductConfig, CartItem, ProductColor } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useCartStore } from "@/store/useCartStore";
import Header from "@/app/components/Header";
import { Share } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { calculateAllSidesPricing } from "@/app/utils/canvasPricing";
import { SavedDesign } from "@/lib/designService";
import { addToCartDB } from "@/lib/cartService";
import { generateProductThumbnail } from "@/lib/thumbnailGenerator";
import QuantitySelectorModal from "@/app/components/QuantitySelectorModal";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import ReviewsSection from "@/app/components/ReviewsSection";
import { useAuthStore } from "@/store/useAuthStore";

interface ProductEditorClientDesktopProps {
  product: Product;
}

export default function ProductEditorClientDesktop({ product }: ProductEditorClientDesktopProps) {
  const searchParams = useSearchParams();
  const cartItemId = searchParams.get('cartItemId');
  const router = useRouter();

  const {
    setEditMode,
    productColor,
    setProductColor,
    saveAllCanvasState,
    restoreAllCanvasState,
    canvasMap,
    canvasVersion,
    incrementCanvasVersion,
    activeSideId,
  } = useCanvasStore();

  const { addItem: addToCart, items: cartStoreItems } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    // Only enable edit mode for authenticated users
    if (isAuthenticated) {
      setEditMode(true);
    }
    return () => setEditMode(false);
  }, [setEditMode, isAuthenticated]);

  const formattedPrice = product.base_price.toLocaleString('ko-KR');

  // Calculate price per item including canvas design costs
  const pricingData = useMemo(() => {
    return calculateAllSidesPricing(canvasMap, product.configuration);
  }, [canvasMap, product.configuration, canvasVersion]);

  const pricePerItem = product.base_price + pricingData.totalAdditionalPrice;

  return (
    <div className="min-h-screen bg-[#f6f6f6] text-black">
      <div className="w-full sticky top-0 bg-white/95 backdrop-blur z-40 border-b border-gray-200">
        <Header back={true} />
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-6">
            <div className="rounded-[28px] bg-white p-6 shadow-sm border border-gray-200">
              <ProductDesigner config={productConfig} layout="desktop" />
            </div>
          </div>

          <aside className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{product.category || '카테고리'}</p>
                <h2 className="text-lg font-semibold text-gray-900 leading-snug mt-1">{product.title}</h2>
              </div>
              <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-50" title="공유">
                <Share className="size-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">디자인 옵션</h3>
                <span className="text-xs text-gray-500">캔버스 편집</span>
              </div>
              <div className="mt-4 space-y-4">
                {(() => {
                  const currentSide = product.configuration.find(side => side.id === activeSideId);
                  const hasLayers = currentSide?.layers && currentSide.layers.length > 0;

                  return hasLayers || (currentSide?.colorOptions && currentSide.colorOptions.length > 0) ? (
                    <LayerColorSelector side={currentSide!} />
                  ) : (
                    productColors.length > 0 && (
                      <div className="overflow-hidden rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-3">컬러 선택</p>
                        <div className="flex flex-wrap gap-3">
                          {productColors.map((color) => (
                            <button
                              key={color.id}
                              onClick={() => handleColorChange(color.hex)}
                              className="flex items-center gap-2"
                            >
                              <div
                                className={`w-8 h-8 rounded-full border-2 ${
                                  productColor === color.hex ? 'border-black' : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: color.hex }}
                              ></div>
                              <span className="text-xs text-gray-700">{color.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  );
                })()}

                <PricingInfo basePrice={product.base_price} sides={product.configuration} />
                <ColorInfo />
                <ObjectPreviewPanel sides={product.configuration} />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">1개당</span>
                <span className="text-gray-900 font-semibold">{formattedPrice}원</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">배송비</span>
                <span className="text-gray-700">3,000원</span>
              </div>
            </div>

            <div className="mt-5">
              {isAuthenticated ? (
                <button
                  onClick={handleAddToCartClick}
                  disabled={isSaving}
                  className="w-full bg-black py-3 text-sm rounded-lg text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {isSaving ? '처리 중...' : '장바구니에 담기'}
                </button>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-blue-600 py-3 text-sm rounded-lg text-white hover:bg-blue-700 transition"
                >
                  로그인하기
                </button>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <ReviewsSection productId={product.id} limit={10} />
        </div>
      </div>

      <QuantitySelectorModal
        isOpen={isQuantitySelectorOpen}
        onClose={() => setIsQuantitySelectorOpen(false)}
        onConfirm={handleSaveToCart}
        sizeOptions={product.size_options || []}
        pricePerItem={pricePerItem}
        isSaving={isSaving}
      />

      {/* Saved Designs Modal */}
      {/* <SavedDesignsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectDesign={handleLoadDesign}
      /> */}
    </div>
  );
}
