
'use client'
import React, {useEffect, useRef} from 'react';
import * as fabric from "fabric";
import { ProductSide } from '@/types/types';


interface SingleSideCanvasProps {
  side: ProductSide;
  width?: number; // these are optional because there will be a default value
  height?: number; // ''
}

const SingleSideCanvas: React.FC<SingleSideCanvasProps> = ({
  side,
  width = 500,
  height = 500
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasEl.current) return; // if the canvas element is not initialized properly pass this code

    const canvas = new fabric.Canvas(canvasEl.current, {
      width,
      height,
      backgroundColor: '#f3f3f3', // light gray background for visibility
      preserveObjectStacking: true, // keeps selected objects from jumping to front automatically
    })




    fabric.FabricImage.fromURL(side.imageUrl)
      .then((img) => {
        if (!img) {
          console.error('Failed to load image:', side.imageUrl);
          return;
        }
        // Scale the image to fit the canvas (basically contains the image inside the canvas)
        const imgWidth = img.width || 0;
        const imgHeight = img.height || 0;

        if (imgWidth === 0 || imgHeight === 0) {
          console.error('Image has invalid dimensions:', imgWidth, 'x', imgHeight);
          return;
        }

        const scale = Math.min(width / imgWidth, height / imgHeight);
        console.log('Calculated scale:', scale);

        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: width / 2,
          top: height / 2,
          selectable: false, // Users should not be able move the t-shirt iteself
          evented: false, // Clicks pass through the objects behind (if any) or canvas
        });

        canvas.add(img);
        canvas.sendObjectToBack(img); // ensure it stays behind design elements
        canvas.requestRenderAll();
        console.log('Image added to canvas:', side.name);
      })
      .catch((error) => {
        console.error('Error loading image for', side.name, ':', error);
      });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };


  }, [side, height, width])

  return (
    <div className='flex flex-col items-center gap-2'>
      <h3 className='text-lg font-semibold'>{side.name}</h3>
      <div className='border border-gray-300 shadow-sm'>
        <canvas ref={canvasEl}/>
      </div>

    </div>
  )
}

export default SingleSideCanvas;
