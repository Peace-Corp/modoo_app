'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import { ProductConfig } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import Header from "@/app/components/Header";
import { Share, Star } from "lucide-react";
import { FaStar } from "react-icons/fa";

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

const mockProductData: ProductConfig = {
  productId: 'shirt-001',
  sides: [
    {
      id: 'front',
      name: '앞면',
      imageUrl: 'https://obxekwyolrmipwmffhwq.supabase.co/storage/v1/object/public/mockups/tshirt/front.png', // Replace with real URL
      printArea: { x: 100, y: 120, width: 200, height: 280 }
    },
    {
      id: 'back',
      name: '뒷면',
      imageUrl: 'https://obxekwyolrmipwmffhwq.supabase.co/storage/v1/object/public/mockups/tshirt/back.png',
      printArea: { x: 100, y: 120, width: 200, height: 280 }
    },
    {
      id: 'sleeve-left',
      name: '왼쪽',
      imageUrl: 'https://obxekwyolrmipwmffhwq.supabase.co/storage/v1/object/public/mockups/tshirt/left_sleeve.png',
      printArea: { x: 100, y: 120, width: 200, height: 280 }
    },
    {
      id: 'sleeve-right',
      name: '오른쪽',
      imageUrl: 'https://obxekwyolrmipwmffhwq.supabase.co/storage/v1/object/public/mockups/tshirt/right_sleeve.png',
      printArea: { x: 100, y: 120, width: 200, height: 280 }
    },
  ],
};


export default function ProductEditorPage() {
  const { isEditMode, setEditMode, productColor, setProductColor } = useCanvasStore();

  const handleColorChange = (color: string) => {
    setProductColor(color);
  };

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
      <ProductDesigner config={mockProductData} />


      {/* Product Details */}
      {!isEditMode && (
        <div className="text-black bg-white p-4 mb-24 flex flex-col gap-1">
          {/* First Section */}
          <div className="w-full flex justify-between">
            <div className="">
              <h2 className="text-xs font-bold">길단</h2>
              <p className="text-black font-normal">오버핏 티셔츠</p>
            </div>
            <div>
              <Share />
            </div>
          </div>
          {/* Price and Delivery Section */}
          <div className="w-full flex justify-between">
            <p className="text-sm text-black">1개당 <span className="font-bold">7,500원</span></p>
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