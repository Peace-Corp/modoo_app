'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import { ProductConfig } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";

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
      <ProductDesigner config={mockProductData} />




      {/* Bottom Bar */}
      {!isEditMode && (
        <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-4 flex items-center justify-center px-4 shadow-2xl shadow-black gap-2">
          <button className="w-full bg-black py-3 text-sm rounded-lg text-white">저장하기</button>
          <EditButton className="w-full"/>
        </div>
      )}

      {/* Product Details */}
      <div className="text-black">
        <p>This is the product</p>
      </div>
    </div>
  )
}