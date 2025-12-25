'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import { Product, ProductConfig } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import Header from "@/app/components/Header";
import { Share } from "lucide-react";
import { FaStar } from "react-icons/fa";
import { useState } from "react";

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
  } = useCanvasStore();

  const [saveMessage, setSaveMessage] = useState('');

  // Convert Product to ProductConfig format
  const productConfig: ProductConfig = {
    productId: product.id,
    sides: product.configuration,
  };

  const handleColorChange = (color: string) => {
    setProductColor(color);
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

  return (
    <div className="">

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
        </div>
      )}


      {/* Bottom Bar */}
      {!isEditMode && (
        <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-4 flex items-center justify-center px-4 shadow-2xl shadow-black gap-2">
          <button className="w-full bg-black py-3 text-sm rounded-lg text-white">저장하기</button>
          <EditButton className="w-full"/>
        </div>
      )}


    </div>



  )
}