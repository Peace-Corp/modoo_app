'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import { ProductConfig } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import Header from "@/app/components/Header";
import { Share } from "lucide-react";

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
  const { isEditMode, setEditMode } = useCanvasStore();
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
            <p className="text-sm text-black">배송비 3,000원</p>
          </div>
          {/* Reviews Section */}
          <div className="flex gap-2 text-[.8em]">
            <p className="text-orange-300">4.9</p>
            <p>리뷰 46</p>
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