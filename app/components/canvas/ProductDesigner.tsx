'use client'

import React from "react";
import dynamic from 'next/dynamic';
import { ProductConfig } from "@/types/types";
import Toolbar from "./Toolbar";


const SingleSideCanvas = dynamic(() => import('@/app/components/canvas/SingleSideCanvas'), {
  ssr: false,
  loading: () => <div className="w-125 h-125 bg-gray-100 animate-pulse" />,
});

interface ProductDesignerProps {
  config: ProductConfig;
}

const ProductDesigner: React.FC<ProductDesignerProps> = ({ config }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-32"> {/* Padding bottom for toolbar space */}
      <div className="p-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Customizer</h1>
        <p className="text-gray-500 mb-8">Select a side to edit</p>
        
        {/* Canvas Grid */}
        <div className="flex flex-wrap gap-8 justify-center">
          {config.sides.map((side) => (
            <SingleSideCanvas 
              key={side.id} 
              side={side}
              width={400}
              height={500}
            />
          ))}
        </div>
      </div>

      {/* The Floating Toolbar */}
      <Toolbar />
    </div>
  );
};

export default ProductDesigner;

