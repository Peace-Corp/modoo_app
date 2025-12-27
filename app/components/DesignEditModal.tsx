'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import ProductDesigner from './canvas/ProductDesigner';
import EditButton from './canvas/EditButton';
import PricingInfo from './canvas/PricingInfo';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ProductConfig } from '@/types/types';
import { generateProductThumbnail } from '@/lib/thumbnailGenerator';
import { createClient } from '@/lib/supabase-client';
import { calculateAllSidesPricing } from '@/app/utils/canvasPricing';

// Mock color list with hex codes
const mockColors = [
  { id: 'white', name: '화이트', hex: '#FFFFFF' },
  { id: 'mix-gray', name: '믹스그레이', hex: '#9CA3AF' },
  { id: 'black', name: '블랙', hex: '#000000' },
  { id: 'navy', name: '네이비', hex: '#1E3A8A' },
  { id: 'red', name: '레드', hex: '#EF4444' },
  { id: 'pink', name: '핑크', hex: '#F9A8D4' },
  { id: 'green', name: '그린', hex: '#22C55E' },
  { id: 'yellow', name: '옐로우', hex: '#FACC15' },
];

interface DesignEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItemId: string | null;
  onSaveComplete?: () => void;
}

export default function DesignEditModal({
  isOpen,
  onClose,
  cartItemId,
  onSaveComplete,
}: DesignEditModalProps) {
  const {
    productColor,
    setProductColor,
    saveAllCanvasState,
    restoreAllCanvasState,
    canvasMap,
    setEditMode,
    isEditMode,
    canvasVersion,
  } = useCanvasStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [hasRestoredDesign, setHasRestoredDesign] = useState(false);

  // Calculate pricing data
  const pricingData = useMemo(() => {
    if (!productConfig) return { totalAdditionalPrice: 0, sidePricing: [] };
    return calculateAllSidesPricing(canvasMap, productConfig.sides);
  }, [canvasMap, productConfig, canvasVersion]);

  const handleColorChange = (color: string) => {
    setProductColor(color);
  };

  // Load the cart item design when modal opens
  useEffect(() => {
    const loadDesign = async () => {
      if (!isOpen || !cartItemId) return;

      setIsLoading(true);
      setHasRestoredDesign(false); // Reset restoration flag
      try {
        // Fetch cart item directly from Supabase
        const supabase = createClient();
        const { data: cartItem, error: cartError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('id', cartItemId)
          .single();

        if (cartError || !cartItem) {
          console.error('Failed to fetch cart item:', cartError);
          alert('디자인을 불러올 수 없습니다.');
          onClose();
          return;
        }

        if (!cartItem.saved_design_id) {
          console.error('Cart item has no saved_design_id');
          alert('디자인을 불러올 수 없습니다.');
          onClose();
          return;
        }

        // Fetch the design from Supabase using saved_design_id
        const { data: design, error: designError } = await supabase
          .from('saved_designs')
          .select('*')
          .eq('id', cartItem.saved_design_id)
          .single();

        if (designError || !design) {
          console.error('Failed to fetch design:', designError);
          alert('디자인을 불러올 수 없습니다.');
          onClose();
          return;
        }

        // Fetch product configuration from Supabase
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', cartItem.product_id)
          .single();

        if (productError || !product) {
          console.error('Failed to fetch product:', productError);
          alert('상품 정보를 불러올 수 없습니다.');
          onClose();
          return;
        }

        // Store base price
        setBasePrice(product.base_price || 0);

        // Set product config - this will trigger ProductDesigner to render
        const config: ProductConfig = {
          productId: product.id,
          sides: product.configuration,
        };

        console.log('Setting product config with sides:', config.sides.map(s => s.id));
        setProductConfig(config);

        // Store the design and cart item data for later restoration
        // We'll restore after the component renders
        (window as any).__pendingDesignRestore = {
          design,
          cartItem,
          config,
        };
      } catch (error) {
        console.error('Failed to load design:', error);
        alert('디자인 불러오기에 실패했습니다.');
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    loadDesign();
  }, [isOpen, cartItemId, onClose]);

  // Separate effect to restore canvas state after ProductDesigner renders
  useEffect(() => {
    const restoreDesign = async () => {
      if (!productConfig || !isOpen || !cartItemId || hasRestoredDesign) return;

      const pendingData = (window as any).__pendingDesignRestore;
      if (!pendingData) return;

      console.log('Starting canvas restoration process...');

      try {
        // Wait for canvases to be registered
        // Get fresh canvasMap from the store each time we check
        const checkCanvasesReady = () => {
          const currentCanvasMap = useCanvasStore.getState().canvasMap;
          return pendingData.config.sides.every((side: any) => currentCanvasMap[side.id]);
        };

        // Poll until canvases are ready with longer timeout and better error handling
        let attempts = 0;
        const maxAttempts = 150; // 15 seconds - longer timeout for dynamic imports
        const pollInterval = 100;

        while (!checkCanvasesReady() && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;

          // Log progress every 2 seconds
          if (attempts % 20 === 0) {
            const currentCanvasMap = useCanvasStore.getState().canvasMap;
            console.log(`Waiting for canvases... (${attempts * pollInterval / 1000}s)`);
            console.log('Registered canvases:', Object.keys(currentCanvasMap));
            console.log('Expected sides:', pendingData.config.sides.map((s: { id: string }) => s.id));
          }
        }

        if (!checkCanvasesReady()) {
          const currentCanvasMap = useCanvasStore.getState().canvasMap;
          const registeredIds = Object.keys(currentCanvasMap);
          const expectedIds = pendingData.config.sides.map((s: { id: string }) => s.id);
          console.error('Canvas initialization timeout:', {
            registered: registeredIds,
            expected: expectedIds,
            missing: expectedIds.filter((id: string) => !registeredIds.includes(id)),
          });
          alert('캔버스를 초기화할 수 없습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
          onClose();
          return;
        }

        console.log('All canvases ready, restoring design...');

        // Restore product color
        if (pendingData.cartItem.product_color) {
          setProductColor(pendingData.cartItem.product_color);
        }

        // Wait for color to be applied
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Restore canvas state from the design
        const canvasState = pendingData.design.canvas_state as Record<string, string>;
        await restoreAllCanvasState(canvasState);

        // Start in view mode (edit mode will be enabled when user clicks the Edit button)
        setEditMode(false);

        console.log('Design restored successfully');

        // Mark as restored to prevent re-running
        setHasRestoredDesign(true);

        // Clear pending data
        delete (window as any).__pendingDesignRestore;
      } catch (error) {
        console.error('Failed to restore design:', error);
        alert('디자인 복원 중 오류가 발생했습니다.');
      }
    };

    restoreDesign();
    // Only depend on productConfig and hasRestoredDesign - NOT canvasMap
    // We read canvasMap directly from the store to avoid re-triggering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productConfig, isOpen, cartItemId, hasRestoredDesign]);

  // Handle close - exit edit mode and reset
  const handleClose = useCallback(() => {
    console.log('Closing modal, cleaning up...');
    setEditMode(false);
    setHasRestoredDesign(false);

    // Clear pending restoration data
    delete (window as unknown as Record<string, unknown>).__pendingDesignRestore;

    // Delay clearing product config to ensure cleanup happens properly
    setTimeout(() => {
      setProductConfig(null);
    }, 100);

    onClose();
  }, [setEditMode, onClose]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!cartItemId) return;

    setIsSaving(true);
    try {
      // Get cart item from Supabase
      const supabase = createClient();
      const { data: cartItem, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('id', cartItemId)
        .single();

      if (cartError || !cartItem || !cartItem.saved_design_id) {
        console.error('Error fetching cart item:', cartError);
        alert('장바구니 항목을 찾을 수 없습니다.');
        return;
      }

      // Get current canvas state
      const canvasState = saveAllCanvasState();

      // Generate new thumbnail
      const thumbnail = generateProductThumbnail(canvasMap, 'front', 200, 200);

      // Get color name from mockColors
      const colorName = mockColors.find(c => c.hex === productColor)?.name || '색상';

      // Recalculate pricing based on updated design
      const pricing = productConfig
        ? calculateAllSidesPricing(canvasMap, productConfig.sides)
        : { totalAdditionalPrice: 0, sidePricing: [] };

      const newPricePerItem = basePrice + pricing.totalAdditionalPrice;

      // Update the design in Supabase
      const { error: updateError } = await supabase
        .from('saved_designs')
        .update({
          canvas_state: canvasState,
          color_selections: { productColor },
          updated_at: new Date().toISOString(),
        })
        .eq('id', cartItem.saved_design_id);

      if (updateError) {
        console.error('Error updating design:', updateError);
        alert('디자인 저장에 실패했습니다.');
        return;
      }

      // Find all cart items with the same saved_design_id
      const { data: itemsToUpdate, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('saved_design_id', cartItem.saved_design_id);

      if (fetchError) {
        console.error('Error fetching items to update:', fetchError);
      }

      // Update all cart items with the same design
      if (itemsToUpdate && itemsToUpdate.length > 0) {
        for (const item of itemsToUpdate) {
          const { error: updateItemError } = await supabase
            .from('cart_items')
            .update({
              product_color: productColor,
              product_color_name: colorName,
              thumbnail_url: thumbnail,
              price_per_item: newPricePerItem,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          if (updateItemError) {
            console.error('Error updating cart item:', updateItemError);
          }
        }
      }

      alert('디자인이 성공적으로 저장되었습니다!');
      if (onSaveComplete) {
        onSaveComplete();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save design:', error);
      alert('디자인 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [cartItemId, saveAllCanvasState, canvasMap, productColor, onSaveComplete, handleClose, productConfig, basePrice]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white">
      {/* Header - only show when NOT in edit mode */}
      {!isEditMode && (
        <div className="sticky top-0 bg-white z-50 border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold">디자인 편집</h2>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">디자인 불러오는 중...</p>
          </div>
        </div>
      ) : productConfig ? (
        <div className={isEditMode ? 'h-screen' : 'overflow-y-auto'}>
          {/* Product Designer */}
          <ProductDesigner config={productConfig as ProductConfig} />

          {/* Color Selector and Pricing - show only when NOT in edit mode */}
          {!isEditMode && (
            <div className="bg-white p-4 pb-24">
              {/* Horizontal Color Selector */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-3">제품 색상</h3>
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3 pb-2">
                    {mockColors.map((color) => (
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
              </div>

              {/* Dynamic Pricing Info */}
              <PricingInfo basePrice={basePrice} sides={productConfig.sides} />

              {/* Edit Button */}
              <div className="mt-4">
                <EditButton />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}