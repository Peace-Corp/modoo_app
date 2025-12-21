import ProductDesigner from "@/app/components/canvas/ProductDesigner";
import EditButton from "@/app/components/canvas/EditButton";
import { ProductConfig } from "@/types/types";

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
  return (
    <div>
      <ProductDesigner config={mockProductData} />
      <EditButton />
    </div>
  )
}