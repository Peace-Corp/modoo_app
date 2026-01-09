'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import PricingInfo from "@/app/components/canvas/PricingInfo";
import ColorInfo from "@/app/components/canvas/ColorInfo";
import LayerColorSelector from "@/app/components/canvas/LayerColorSelector";
import ObjectPreviewPanel from "@/app/components/canvas/ObjectPreviewPanel";
import { Product, ProductConfig, CartItem, ProductColor } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useCartStore } from "@/store/useCartStore";
import { useFontStore } from "@/store/useFontStore";
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
    activeSideId,
  } = useCanvasStore();

  const { addItem: addToCart, items: cartStoreItems } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  // const [isModalOpen, setIsModalOpen] = useState(false);
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
  const descriptionImageUrl = product.description_image ?? null;

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

      // Get custom fonts from store
      const customFonts = useFontStore.getState().customFonts;

      const savedDesign = await saveDesign({
        productId: product.id,
        title: designTitle.trim(),
        productColor: productColor,
        canvasState: canvasState,
        previewImage: previewImage,
        pricePerItem: pricePerItem,
        canvasMap: canvasMap, // Pass canvas instances for client-side SVG export
        customFonts: customFonts, // Include custom fonts metadata
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
      const colorName = productColors.find(c => c.hex === productColor)?.name || '색상';

      // Get custom fonts from store
      const customFonts = useFontStore.getState().customFonts;

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
          customFonts: customFonts, // Include custom fonts metadata
          canvasMap: canvasMap, // Pass canvas instances for SVG text export
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

  // const handleSaveDesignOnly = async (designTitle: string) => {
  //   setIsSaving(true);
  //   try {
  //     const canvasState = saveAllCanvasState();
  //     const previewImage = generateProductThumbnail(canvasMap, 'front', 400, 400);

  //     const savedDesign = await saveDesign({
  //       productId: product.id,
  //       title: designTitle.trim(),
  //       productColor: productColor,
  //       canvasState: canvasState,
  //       previewImage: previewImage,
  //       pricePerItem: pricePerItem,
  //     });

  //     if (!savedDesign) {
  //       alert('디자인 저장에 실패했습니다.');
  //       return;
  //     }

  //     alert('디자인이 저장되었습니다.');
  //     setIsSaveDesignOpen(false);
  //   } catch (error) {
  //     console.error('Save design failed:', error);
  //     alert('디자인 저장 중 오류가 발생했습니다.');
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

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
    if (cartItemId) return;

    const saved = getGuestDesign(product.id);
    if (!saved) return;

    setGuestDesign(saved);
    setIsRecallGuestDesignOpen(true);
  }, [cartItemId, product.id]);

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

  // Scroll to top and prevent scrolling when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      // Re-enable scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isEditMode]);

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



          {/* Layer Color Selector (for products with multi-layer support) */}
          {(() => {
            const currentSide = product.configuration.find(side => side.id === activeSideId);
            const hasLayers = currentSide?.layers && currentSide.layers.length > 0;

            return hasLayers || (currentSide?.colorOptions && currentSide.colorOptions.length > 0) ? (
              <div className="mt-4">
                <LayerColorSelector side={currentSide!} />
              </div>
            ) : (
              /* Legacy Horizontal Color Selector (for products without layers) */
              productColors.length > 0 && (
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
              )
            );
          })()}

          {/* Dynamic Pricing Info */}
          <PricingInfo basePrice={product.base_price} sides={product.configuration} />

          {/* Color Information */}
          <ColorInfo className="mt-4" />

          {/* Object Preview Panel */}
          <ObjectPreviewPanel sides={product.configuration} />

          {/* Reviews Section */}
          <ReviewsSection productId={product.id} limit={10} />

          {/* Description Image Section */}
          <DescriptionImageSection title="주문상세" imageUrl={descriptionImageUrl} />
        </div>
      )}


      {/* Bottom Bar */}
      {!isEditMode && (
        <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-3 px-4 shadow-2xl shadow-black">
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePurchaseClick}
              disabled={isSaving}
              className="w-full bg-black py-3 text-sm rounded-lg text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isSaving ? '처리 중...' : '구매하기'}
            </button>
            <EditButton className="w-full"/>
          </div>
        </div>
      )}

      <PurchaseOptionModal
        isOpen={isPurchaseOptionOpen}
        onClose={() => setIsPurchaseOptionOpen(false)}
        onSelectCoBuy={handleSelectCoBuyPurchase}
        onSelectCart={handleSelectCartPurchase}
        isDisabled={isSaving}
      />

      {/* Quantity Selector Modal */}
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
        message="구매를 진행하려면 로그인이 필요합니다.\n 디자인을 임시 저장해두었습니다."
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

    </div>



  )
}
