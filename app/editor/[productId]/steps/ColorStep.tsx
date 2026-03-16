'use client'
import { Product, ProductColor, ProductSide } from '@/types/types'
import { useCanvasStore } from '@/store/useCanvasStore'
import LayerColorSelector from '@/app/components/canvas/LayerColorSelector'
import { ChevronLeft } from 'lucide-react'

interface ColorStepProps {
  product: Product
  productColors: ProductColor[]
  activeSideId: string
  onNext: () => void
  onBack: () => void
}

export default function ColorStep({
  product,
  productColors,
  activeSideId,
  onNext,
  onBack,
}: ColorStepProps) {
  const { productColor, setProductColor } = useCanvasStore()
  const thumbnailImage = product.thumbnail_image_link?.[0]

  const currentSide = product.configuration.find((side) => side.id === activeSideId)
  const hasLayers = currentSide?.layers && currentSide.layers.length > 0
  const hasColorOptions = currentSide?.colorOptions && currentSide.colorOptions.length > 0
  const hasLegacyColors = productColors.length > 0

  return (
    <div className="text-black bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold">색상 선택</h2>
      </div>

      {/* Product Reference Image */}
      {thumbnailImage && (
        <div className="w-full flex justify-center py-4 bg-gray-50">
          <img
            src={thumbnailImage}
            alt={product.title}
            className="h-48 object-contain"
          />
        </div>
      )}

      {/* Color Selection */}
      <div className="p-4">
        {hasLayers || hasColorOptions ? (
          <LayerColorSelector side={currentSide!} />
        ) : hasLegacyColors ? (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">색상을 선택해주세요</p>
            <div className="flex flex-wrap gap-3">
              {productColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setProductColor(color.manufacturer_colors.hex)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 ${
                      productColor === color.manufacturer_colors.hex
                        ? 'border-black'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.manufacturer_colors.hex }}
                  />
                  <span className="text-xs">{color.manufacturer_colors.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">색상 옵션이 없습니다.</p>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="w-full fixed bottom-0 left-0 bg-white pb-6 pt-3 px-4 shadow-2xl shadow-black z-50">
        <button
          onClick={onNext}
          className="w-full bg-black py-3 text-sm rounded-lg text-white transition"
        >
          다음
        </button>
      </div>
    </div>
  )
}
