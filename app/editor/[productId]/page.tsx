'use client'
import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import { ProductConfig } from "@/types/types";
import { useCanvasStore } from "@/store/useCanvasStore";
import Header from "@/app/components/Header";

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
        {!isEditMode && (
          <div className="w-full sticky top-0 bg-gray-300 z-50">
            <Header back={true} />
          </div>
          )
        }


      {/* The actual product designer component */}
      <ProductDesigner config={mockProductData} />


      {/* Bottom Bar */}
      {!isEditMode && (
        <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-4 flex items-center justify-center px-4 shadow-2xl shadow-black gap-2">
          <button className="w-full bg-black py-3 text-sm rounded-lg text-white">저장하기</button>
          <EditButton className="w-full"/>
        </div>
      )}

      {/* Product Details */}
      {!isEditMode && (
        <div className="text-black bg-white p-6 mb-24">
          <h2 className="text-xl font-bold mb-2">상품 정보</h2>
          <p className="text-gray-700">티셔츠 - 커스텀 디자인</p>
          <p className="text-sm text-gray-500 mt-2">원하는 디자인을 자유롭게 추가하세요</p>
        </div>
      )}
    </div>
  )
}