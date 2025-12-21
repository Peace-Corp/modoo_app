'use client'

import React from "react";
import dynamic from 'next/dynamic';
import { ProductConfig } from "@/types/types";


const SingleSideCanvas = dynamic(() => import('@/app/components/canvas/SingleSideCanvas'), {
  ssr: false,
  loading: () => <div className="w-125 h-125 bg-gray-100 animate-pulse" />,
});

interface ProductDesignerProps {
  config: ProductConfig;
}

const ProductDesigner: React.FC<ProductDesignerProps> = ({ config }) => {
  return (
    <div className="p-8">
      <h1>Product test</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        {config.sides.map((side) => (
          <SingleSideCanvas
            key={side.id}
            side={side}
            width={400} // customize if needed
            height={500}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductDesigner;

