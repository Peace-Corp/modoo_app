'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'

import 'swiper/css'
import 'swiper/css/pagination'

interface ProductImageGalleryProps {
  images: string[]
}

export default function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [swiper, setSwiper] = useState<SwiperType | null>(null)

  if (images.length === 0) {
    return (
      <div className="w-full aspect-4/5 bg-gray-100 flex items-center justify-center">
        <span className="text-sm text-gray-400">이미지 없음</span>
      </div>
    )
  }

  const goPrev = () => {
    const next = activeIndex > 0 ? activeIndex - 1 : images.length - 1
    setActiveIndex(next)
    swiper?.slideTo(next)
  }
  const goNext = () => {
    const next = activeIndex < images.length - 1 ? activeIndex + 1 : 0
    setActiveIndex(next)
    swiper?.slideTo(next)
  }

  return (
    <div className="w-full lg:flex lg:gap-3">
      {/* Thumbnails - desktop only */}
      {images.length > 1 && (
        <div className="hidden lg:flex lg:flex-col lg:gap-2 lg:w-20 lg:shrink-0 lg:overflow-y-auto lg:max-h-175">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveIndex(idx)
                swiper?.slideTo(idx)
              }}
              className={`rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                idx === activeIndex
                  ? 'border-black'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <Image
                src={img}
                alt={`썸네일 ${idx + 1}`}
                width={80}
                height={80}
                className="w-full aspect-square object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Main Image with Swiper */}
        <div className="relative w-full aspect-1/1 bg-gray-50 overflow-hidden lg:rounded-lg">
          <Swiper
            modules={[Pagination]}
            onSwiper={setSwiper}
            onSlideChange={(s) => setActiveIndex(s.activeIndex)}
            initialSlide={activeIndex}
            className="w-full h-full"
          >
            {images.map((img, idx) => (
              <SwiperSlide key={idx}>
                <div className="relative w-full h-full">
                  <Image
                    src={img}
                    alt={`제품 이미지 ${idx + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={idx === 0}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Desktop navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow transition"
              >
                <ChevronLeft className="size-5 text-gray-700" />
              </button>
              <button
                onClick={goNext}
                className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow transition"
              >
                <ChevronRight className="size-5 text-gray-700" />
              </button>
            </>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 z-10 text-xs text-white bg-black/50 px-2 py-1 rounded">
              {activeIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Mobile dots */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 py-3 lg:hidden">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveIndex(idx)
                  swiper?.slideTo(idx)
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === activeIndex ? 'bg-gray-800' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
