
'use client'
import React, {useEffect, useRef} from 'react';
import * as fabric from "fabric";
import { ProductSide } from '@/types/types';
import { useCanvasStore } from '@/store/useCanvasStore';


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

  const { registerCanvas, unregisterCanvas, setActiveSide, activeSideId } = useCanvasStore();
  const isActive = activeSideId === side.id; // checks whether the active canvas is the current canvas

  // const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasEl.current) return; // if the canvas element is not initialized properly pass this code

    const canvas = new fabric.Canvas(canvasEl.current, {
      width,
      height,
      backgroundColor: '#f3f3f3', // light gray background for visibility
      preserveObjectStacking: true, // keeps selected objects from jumping to front automatically
    })

    // Register this canvas to the global store
    registerCanvas(side.id, canvas)

    // Load background image
    fabric.FabricImage.fromURL(side.imageUrl)
      .then((img) => {
        if (!img) {
          console.error('Failed to load image:', side.imageUrl);
          return;
        }
        // Scale the image to fit the canvas (basically contains the image inside the canvas)
        const imgWidth = img.width || 0;
        const imgHeight = img.height || 0;
        // Error logging
        if (imgWidth === 0 || imgHeight === 0) {
          console.error('Image has invalid dimensions:', imgWidth, 'x', imgHeight);
          return;
        }

        // for changing the scaling of the image based on the canvas's width and height
        const scale = Math.min(width / imgWidth*2, height / imgHeight);

        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: width / 2,
          top: height / 2,
          selectable: false, // Users should not be able move the t-shirt itself
          evented: false, // Clicks pass through the objects behind (if any) or canvas
        });

        canvas.add(img);
        canvas.sendObjectToBack(img); // ensure it stays behind design elements
        canvas.requestRenderAll();
      })
      .catch((error) => {
        console.error('Error loading image for', side.name, ':', error);
      });



    return () => {
      unregisterCanvas(side.id);
      canvas.dispose();
      // fabricCanvasRef.current = null;
    };


  }, [side, height, width, registerCanvas, unregisterCanvas, setActiveSide]);

  return (
    <div 
      className={`flex flex-col items-center gap-2 cursor-pointer transition-all duration-200
        ${isActive ? 'ring-2 ring-blue-500 scale-105' : 'opacity-80 hover:opacity-100'}
      `}
      onClick={() => setActiveSide(side.id)} // User clicks the div to activate
    >
      <h3 className={`text-lg font-bold ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
        {side.name}
      </h3>
      <div className='border border-gray-300 shadow-sm'>
        <canvas ref={canvasEl}/>
      </div>
    </div>
  )
}

export default SingleSideCanvas;
