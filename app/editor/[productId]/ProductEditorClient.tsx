'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import PricingInfo from "@/app/components/canvas/PricingInfo";
import { Product, ProductConfig, CartItem } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import Header from "@/app/components/Header";
import { Share, Plus, Minus } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { useState, useMemo } from "react";
import { calculateAllSidesPricing } from "@/app/utils/canvasPricing";

// Mock color list with hex codes
const mockColors = [
  { id: 'mix-gray', name: '믹스그레이', hex: '#9CA3AF' },
  { id: 'white', name: '화이트', hex: '#FFFFFF' },
  { id: 'black', name: '블랙', hex: '#000000' },
  { id: 'navy', name: '네이비', hex: '#1E3A8A' },
  { id: 'red', name: '레드', hex: '#EF4444' },
  { id: 'pink', name: '핑크', hex: '#F9A8D4' },
  { id: 'green', name: '그린', hex: '#22C55E' },
  { id: 'yellow', name: '옐로우', hex: '#FACC15' },
];

interface ProductEditorClientProps {
  product: Product;
}

export default function ProductEditorClient({ product }: ProductEditorClientProps) {
  const {
    isEditMode,
    setEditMode,
    productColor,
    setProductColor,
    saveAllCanvasState,
    restoreAllCanvasState,
    activeSideId,
    canvasMap,
    canvasVersion,
  } = useCanvasStore();

  const [saveMessage, setSaveMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    // Initialize selected size to first available option
    return product.size_options && product.size_options.length > 0
      ? product.size_options[0].id
      : '';
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Convert Product to ProductConfig format
  const productConfig: ProductConfig = {
    productId: product.id,
    sides: product.configuration,
  };

  const handleColorChange = (color: string) => {
    setProductColor(color);
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handleAddToCart = () => {
    if (!selectedSize || quantity < 1) return;

    const sizeName = product.size_options?.find(s => s.id === selectedSize)?.name || selectedSize;

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.sizeId === selectedSize);

      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      } else {
        // Add new item
        return [...prev, { sizeId: selectedSize, sizeName, quantity }];
      }
    });

    // Reset quantity to 1 after adding
    setQuantity(1);
  };

  const handleUpdateCartItemQuantity = (sizeId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      setCartItems(prev => prev.filter(item => item.sizeId !== sizeId));
    } else {
      // Update quantity
      setCartItems(prev =>
        prev.map(item =>
          item.sizeId === sizeId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  // Save to localStorage
  const handleSave = () => {
    try {
      const canvasState = saveAllCanvasState();
      const fullState = {
        canvases: canvasState,
        productColor,
        activeSideId,
      };
      localStorage.setItem('canvas-design-test', JSON.stringify(fullState));
      setSaveMessage('✓ Saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage('✗ Save failed');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  // Load from localStorage
  const handleLoad = async () => {
    try {
      const savedData = localStorage.getItem('canvas-design-test');
      if (!savedData) {
        setSaveMessage('✗ No saved data');
        setTimeout(() => setSaveMessage(''), 2000);
        return;
      }

      const fullState = JSON.parse(savedData);
      await restoreAllCanvasState(fullState.canvases);

      if (fullState.productColor) {
        setProductColor(fullState.productColor);
      }

      setSaveMessage('✓ Loaded!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Load failed:', error);
      setSaveMessage('✗ Load failed');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  // Clear localStorage
  const handleClear = () => {
    localStorage.removeItem('canvas-design-test');
    setSaveMessage('✓ Cleared!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const formattedPrice = product.base_price.toLocaleString('ko-KR');

  // Calculate price per item including canvas design costs
  const pricingData = useMemo(() => {
    return calculateAllSidesPricing(canvasMap, product.configuration);
  }, [canvasMap, product.configuration, canvasVersion]);

  const pricePerItem = product.base_price + pricingData.totalAdditionalPrice;

  // Calculate total price
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = totalQuantity * pricePerItem;
  const formattedTotalPrice = totalPrice.toLocaleString('ko-KR');
  const formattedPricePerItem = pricePerItem.toLocaleString('ko-KR');

  return (
    <div className="pb-[400px]">

      {/* Test Save/Load Buttons - Fixed in top-right corner */}
      <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-gray-200">
        <div className="text-xs font-bold text-gray-700 mb-1">Test Controls</div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition"
        >
          Save State
        </button>
        <button
          onClick={handleLoad}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium transition"
        >
          Load State
        </button>
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium transition"
        >
          Clear Storage
        </button>
        {saveMessage && (
          <div className="text-xs text-center font-medium text-gray-700 mt-1">
            {saveMessage}
          </div>
        )}
      </div>

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
        <div className="text-black bg-white p-4 mb-24 flex flex-col gap-1">
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

          {/* Size Selector */}
          {product.size_options && product.size_options.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">사이즈</h3>
              <div className="flex gap-2 flex-wrap">
                {product.size_options.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${
                      selectedSize === size.id
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white text-black hover:border-gray-400'
                    }`}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">수량</span>
              <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-2 py-1">
                <button
                  onClick={handleDecreaseQuantity}
                  disabled={quantity <= 1}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-8 text-center font-medium">{quantity}</span>
                <button
                  onClick={handleIncreaseQuantity}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddToCart}
              className="w-full mt-3 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              추가
            </button>
          </div>

          {/* Dynamic Pricing Info */}
          <PricingInfo basePrice={product.base_price} sides={product.configuration} />


          

          {/* Cart Items List */}
          {/* {cartItems.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium mb-3">선택한 옵션</h3>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.sizeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{item.sizeName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 bg-white">
                        <button
                          onClick={() => handleUpdateCartItemQuantity(item.sizeId, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 rounded transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateCartItemQuantity(item.sizeId, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 rounded transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}
        </div>
      )}


      {/* Bottom Bar */}
      {!isEditMode && (
        <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-3 px-4 shadow-2xl shadow-black">
          {/* Cart Items Summary */}
          {cartItems.length > 0 && (
            <div className="mb-3 max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.sizeId} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                    <span className="font-medium">{item.sizeName}</span>
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 bg-white">
                      <button
                        onClick={() => handleUpdateCartItemQuantity(item.sizeId, item.quantity - 1)}
                        className="p-1 hover:bg-gray-100 rounded transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="min-w-6 text-center text-xs font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateCartItemQuantity(item.sizeId, item.quantity + 1)}
                        className="p-1 hover:bg-gray-100 rounded transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Price Summary */}
          {cartItems.length > 0 && (
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>개당 가격 (디자인 포함)</span>
                <span>{formattedPricePerItem}원</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">총 수량</span>
                <span className="font-medium">{totalQuantity}개</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-medium">총 금액</span>
                <span className="text-lg font-bold">{formattedTotalPrice}원</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button className="w-full bg-black py-3 text-sm rounded-lg text-white">저장하기</button>
            <EditButton className="w-full"/>
          </div>
        </div>
      )}


    </div>



  )
}