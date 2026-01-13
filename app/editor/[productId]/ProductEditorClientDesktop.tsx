'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import PricingInfo from "@/app/components/canvas/PricingInfo";
import ColorInfo from "@/app/components/canvas/ColorInfo";
import LayerColorSelector from "@/app/components/canvas/LayerColorSelector";
import ObjectPreviewPanel from "@/app/components/canvas/ObjectPreviewPanel";
import DesktopToolbar from "@/app/components/canvas/DesktopToolbar";
import { Product, ProductConfig, CartItem, ProductColor } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useCartStore } from "@/store/useCartStore";
import Header from "@/app/components/Header";
import { Share } from "lucide-react";
import { useState, useEffect } from "react";
import { calculateAllSidesPricing, type PricingSummary } from "@/app/utils/canvasPricing";
import { saveDesign } from "@/lib/designService";
import { addToCartDB } from "@/lib/cartService";
import { generateProductThumbnail } from "@/lib/thumbnailGenerator";
import QuantitySelectorModal from "@/app/components/QuantitySelectorModal";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import ReviewsSection from "@/app/components/ReviewsSection";
import DescriptionImageSection from "@/app/components/DescriptionImageSection";
import { useAuthStore } from "@/store/useAuthStore";
import SaveDesignModal from "@/app/components/SaveDesignModal";
import CreateCoBuyModal from "@/app/components/cobuy/CreateCoBuyModal";
import PurchaseOptionModal from "@/app/components/PurchaseOptionModal";
import LoginPromptModal from "@/app/components/LoginPromptModal";
import GuestDesignRecallModal from "@/app/components/GuestDesignRecallModal";
import { getGuestDesign, removeGuestDesign, saveGuestDesign, type GuestDesign } from "@/lib/guestDesignStorage";

type CoBuyDesign = {
  id: string;
  title: string | null;
  preview_url: string | null;
  price_per_item: number;
  product: {
    id: string;
    title: string;
    size_options?: Product["size_options"];
  };
};

interface ProductEditorClientDesktopProps {
  product: Product;
}

export default function ProductEditorClientDesktop({ product }: ProductEditorClientDesktopProps) {
  const searchParams = useSearchParams();
  const cartItemId = searchParams.get('cartItemId');
  const descriptionImageUrl = product.description_image ?? null;

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
  const [isPurchaseOptionOpen, setIsPurchaseOptionOpen] = useState(false);
  const [isSaveDesignOpen, setIsSaveDesignOpen] = useState(false);
  const [isCreateCoBuyOpen, setIsCreateCoBuyOpen] = useState(false);
  const [coBuyDesign, setCoBuyDesign] = useState<CoBuyDesign | null>(null);
  const [, setIsLoadingCartItem] = useState(false);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isRecallGuestDesignOpen, setIsRecallGuestDesignOpen] = useState(false);
  const [guestDesign, setGuestDesign] = useState<GuestDesign | null>(null);

  // Convert Product to ProductConfig format
  const productConfig: ProductConfig = {
    productId: product.id,
    sides: product.configuration,
  };

  const handleColorChange = (color: string) => {
    setProductColor(color);
  };

  const handlePurchaseClick = () => {
    if (!isAuthenticated) {
      const canvasState = saveAllCanvasState();
      saveGuestDesign({
        productId: product.id,
        productColor,
        canvasState,
      });
      setIsLoginPromptOpen(true);
      return;
    }
    setIsPurchaseOptionOpen(true);
  };

  const handleSelectCartPurchase = () => {
    if (!isAuthenticated) {
      setIsPurchaseOptionOpen(false);
      const canvasState = saveAllCanvasState();
      saveGuestDesign({
        productId: product.id,
        productColor,
        canvasState,
      });
      setIsLoginPromptOpen(true);
      return;
    }
    setIsPurchaseOptionOpen(false);
    setIsQuantitySelectorOpen(true);
  };

  const handleSelectCoBuyPurchase = () => {
    if (!isAuthenticated) {
      setIsPurchaseOptionOpen(false);
      const canvasState = saveAllCanvasState();
      saveGuestDesign({
        productId: product.id,
        productColor,
        canvasState,
      });
      setIsLoginPromptOpen(true);
      return;
    }
    setIsPurchaseOptionOpen(false);
    setIsSaveDesignOpen(true);
  };

  const handleSaveDesignForCoBuy = async (designTitle: string) => {
    if (!isAuthenticated) {
      const canvasState = saveAllCanvasState();
      saveGuestDesign({
        productId: product.id,
        productColor,
        canvasState,
      });
      setIsLoginPromptOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const canvasState = saveAllCanvasState();
      const previewImage = generateProductThumbnail(canvasMap, 'front', 400, 400);

      const savedDesign = await saveDesign({
        productId: product.id,
        title: designTitle.trim(),
        productColor: productColor,
        canvasState: canvasState,
        previewImage: previewImage,
        pricePerItem: pricePerItem,
        canvasMap: canvasMap, // Pass canvas instances for client-side SVG export
      });

      if (!savedDesign) {
        alert('디자인 저장에 실패했습니다.');
        return;
      }

      setCoBuyDesign({
        id: savedDesign.id,
        title: savedDesign.title,
        preview_url: savedDesign.preview_url,
        price_per_item: pricePerItem,
        product: {
          id: product.id,
          title: product.title,
          size_options: product.size_options,
        },
      });

      setIsSaveDesignOpen(false);
      setIsCreateCoBuyOpen(true);

      removeGuestDesign(product.id);
    } catch (error) {
      console.error('Save design failed:', error);
      alert('디자인 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save design to cart and clear state
  const handleSaveToCart = async (designName: string, selectedItems: CartItem[]) => {
    if (!isAuthenticated) {
      const canvasState = saveAllCanvasState();
      saveGuestDesign({
        productId: product.id,
        productColor,
        canvasState,
      });
      setIsLoginPromptOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const canvasState = saveAllCanvasState();
      const thumbnail = generateProductThumbnail(canvasMap, 'front', 200, 200);
      const previewImage = generateProductThumbnail(canvasMap, 'front', 400, 400);
      const selectedColor = productColors.find(c => c.manufacturer_colors.hex === productColor);
      const colorName = selectedColor?.manufacturer_colors.name || '색상';
      const colorCode = selectedColor?.manufacturer_colors.color_code;

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
          productColorCode: colorCode,
          size: item.size,
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
          productColorCode: colorCode,
          size: item.size,
          quantity: item.quantity,
          pricePerItem: pricePerItem,
          canvasState: canvasState,
          thumbnailUrl: thumbnail,
          savedDesignId: sharedDesignId, // All items share the same design ID
          designName: designName, // Custom design name
        });
      }

      removeGuestDesign(product.id);

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

  // Fetch product colors from database (joined with manufacturer_colors)
  useEffect(() => {
    const fetchColors = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('product_colors')
        .select(`
          id,
          product_id,
          manufacturer_color_id,
          is_active,
          sort_order,
          created_at,
          updated_at,
          manufacturer_colors (
            id,
            name,
            hex,
            color_code
          )
        `)
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Failed to fetch product colors:', error);
        return;
      }

      if (data && data.length > 0) {
        // Transform data to match ProductColor type (Supabase returns single FK as object, not array)
        const colors = data.map((item) => ({
          ...item,
          manufacturer_colors: item.manufacturer_colors as unknown as ProductColor['manufacturer_colors'],
        })) as ProductColor[];
        // Sort by color_code ascending
        colors.sort((a, b) => (a.manufacturer_colors?.color_code || '').localeCompare(b.manufacturer_colors?.color_code || ''));
        setProductColors(colors);
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
    if (cartItemId) return;

    const saved = getGuestDesign(product.id);
    if (!saved) return;

    setGuestDesign(saved);
    setIsRecallGuestDesignOpen(true);
  }, [cartItemId, product.id]);

  useEffect(() => {
    setEditMode(true);
    return () => setEditMode(false);
  }, [setEditMode]);

  const formattedPrice = product.base_price.toLocaleString('ko-KR');

  // Calculate price per item including canvas design costs
  const [pricingData, setPricingData] = useState<PricingSummary>({
    totalAdditionalPrice: 0,
    sidePricing: [],
    totalObjectCount: 0
  });

  useEffect(() => {
    const calculatePricing = async () => {
      const pricing = await calculateAllSidesPricing(canvasMap, product.configuration);
      setPricingData(pricing);
    };
    calculatePricing();
  }, [canvasMap, product.configuration, canvasVersion]);

  const pricePerItem = product.base_price + pricingData.totalAdditionalPrice;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="w-full sticky top-0 bg-white/95 backdrop-blur z-40 border-b border-gray-200">
        <Header back={true} />
      </div>

      <div className="">
        {/* Editor Container */}
        <div className="grid gap-2 grid-cols-2 min-h-[calc(100vh-4rem)]">
          {/* Left Side */}
          <div className="flex flex-col gap-2">
            <div className="rounded-md bg-white p-6 shadow-sm border border-gray-200">
              <ProductDesigner config={productConfig} layout="desktop" />
            </div>
          </div>

          {/* Right Side */}
          <aside className="rounded-md bg-white p-4 border border-gray-200 h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{product.category || '카테고리'}</p>
                <h2 className="text-lg font-semibold text-gray-900 leading-snug mt-1">{product.title}</h2>
              </div>
              <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-50" title="공유">
                <Share className="size-4" />
              </button>
            </div>

            <div className="mt-4 rounded-md border border-gray-200 p-2 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">디자인 옵션</h3>
                <span className="text-xs text-gray-500">캔버스 편집</span>
              </div>
              <DesktopToolbar sides={productConfig.sides} productId={productConfig.productId} />
              <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
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
                              onClick={() => handleColorChange(color.manufacturer_colors.hex)}
                              className="flex items-center gap-2"
                            >
                              <div
                                className={`w-8 h-8 rounded-full border-2 ${
                                  productColor === color.manufacturer_colors.hex ? 'border-black' : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: color.manufacturer_colors.hex }}
                              ></div>
                              <span className="text-xs text-gray-700">{color.manufacturer_colors.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  );
                })()}

                <ObjectPreviewPanel sides={product.configuration} />
                <ColorInfo />
                <PricingInfo basePrice={product.base_price} sides={product.configuration} />
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
	              {/* Purchase Button */}
	              <button
	                onClick={handlePurchaseClick}
	                disabled={isSaving}
	                className="w-full bg-black py-3 text-sm rounded-lg text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition"
	              >
	                {isSaving ? '처리 중...' : '구매하기'}
	              </button>
	            </div>
	          </aside>
	        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <ReviewsSection productId={product.id} limit={10} />
          <DescriptionImageSection title="주문상세" imageUrl={descriptionImageUrl} />
        </div>
      </div>

      <QuantitySelectorModal
        isOpen={isQuantitySelectorOpen}
        onClose={() => setIsQuantitySelectorOpen(false)}
        onConfirm={handleSaveToCart}
        sizeOptions={product.size_options || []}
        pricePerItem={pricePerItem}
        isSaving={isSaving}
        canvasMap={canvasMap}
        sides={product.configuration}
        basePrice={product.base_price}
        discountRates={product.discount_rates}
      />

      <PurchaseOptionModal
        isOpen={isPurchaseOptionOpen}
        onClose={() => setIsPurchaseOptionOpen(false)}
        onSelectCoBuy={handleSelectCoBuyPurchase}
        onSelectCart={handleSelectCartPurchase}
        isDisabled={isSaving}
      />

      <SaveDesignModal
        isOpen={isSaveDesignOpen}
        onClose={() => setIsSaveDesignOpen(false)}
        onConfirm={handleSaveDesignForCoBuy}
        isSaving={isSaving}
        defaultDesignName={product.title}
      />

	      <CreateCoBuyModal
	        isOpen={isCreateCoBuyOpen}
	        onClose={() => {
	          setIsCreateCoBuyOpen(false);
	          setCoBuyDesign(null);
	        }}
	        design={coBuyDesign}
	      />

	      <LoginPromptModal
	        isOpen={isLoginPromptOpen}
	        onClose={() => setIsLoginPromptOpen(false)}
	        title="로그인이 필요합니다"
	        message="구매를 진행하려면 로그인이 필요합니다. 디자인을 임시 저장해두었습니다."
	      />

	      <GuestDesignRecallModal
	        isOpen={isRecallGuestDesignOpen}
	        onRecall={async () => {
	          if (!guestDesign) {
	            setIsRecallGuestDesignOpen(false);
	            return;
	          }

	          const checkCanvasesReady = () => {
	            return product.configuration.every(side => canvasMap[side.id]);
	          };

	          let attempts = 0;
	          const maxAttempts = 50; // 5 seconds max
	          while (!checkCanvasesReady() && attempts < maxAttempts) {
	            await new Promise(resolve => setTimeout(resolve, 100));
	            attempts++;
	          }

	          if (!checkCanvasesReady()) {
	            console.error('Canvases not ready after timeout');
	            setIsRecallGuestDesignOpen(false);
	            return;
	          }

	          setProductColor(guestDesign.productColor);
	          await new Promise(resolve => setTimeout(resolve, 100));
	          await restoreAllCanvasState(guestDesign.canvasState);
	          incrementCanvasVersion();
	          setIsRecallGuestDesignOpen(false);
	        }}
	        onDiscard={() => {
	          removeGuestDesign(product.id);
	          setGuestDesign(null);
	          setIsRecallGuestDesignOpen(false);
	        }}
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
