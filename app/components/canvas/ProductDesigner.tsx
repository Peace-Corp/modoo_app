'use client'

import React, { useRef } from "react";
import dynamic from 'next/dynamic';
import { ProductConfig } from "@/types/types";
import Toolbar from "./Toolbar";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { useCanvasStore } from '@/store/useCanvasStore';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';


const SingleSideCanvas = dynamic(() => import('@/app/components/canvas/SingleSideCanvas'), {
  ssr: false,
  loading: () => <div className="w-125 h-125 bg-gray-100 animate-pulse" />,
});

interface ProductDesignerProps {
  config: ProductConfig;
}

const ProductDesigner: React.FC<ProductDesignerProps> = ({ config }) => {
  const { isEditMode, setEditMode, setActiveSide, activeSideId } = useCanvasStore();
  const swiperRef = useRef<SwiperType | null>(null);

  const handleSlideChange = (swiper: SwiperType) => {
    const activeIndex = swiper.activeIndex;
    const activeSide = config.sides[activeIndex];
    if (activeSide) {
      setActiveSide(activeSide.id);
    }
  };

  const handleExitEdit = () => {
    setEditMode(false);
  };

  // Find initial slide index based on active side
  const initialSlide = config.sides.findIndex(side => side.id === activeSideId) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {!isEditMode ? (
        // Swiper View
        <div className="p-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Customizer</h1>
          <p className="text-gray-500 mb-8">Swipe to select a side to edit</p>

          <div className="max-w-2xl mx-auto">
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={50}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              onSwiper={(swiper) => { swiperRef.current = swiper; }}
              onSlideChange={handleSlideChange}
              initialSlide={initialSlide}
              className="pb-12"
            >
              {config.sides.map((side) => (
                <SwiperSlide key={side.id}>
                  <div className="flex flex-col items-center gap-4">
                    <SingleSideCanvas
                      side={side}
                      width={400}
                      height={500}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      ) : (
        // Edit Mode - Full Screen Canvas
        <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col">
          {/* Header with Exit Button */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Editing: <span className="text-blue-600 capitalize">{activeSideId}</span>
            </h2>
            <button
              onClick={handleExitEdit}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
            >
              Done
            </button>
          </div>

          {/* Full Screen Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-auto pb-24">
            {config.sides
              .filter(side => side.id === activeSideId)
              .map((side) => (
                <SingleSideCanvas
                  key={side.id}
                  side={side}
                  width={450}
                  height={750}
                />
              ))}
          </div>

          {/* Toolbar */}
          <Toolbar />
        </div>
      )}
    </div>
  );
};

export default ProductDesigner;

