
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


    // -- For calculations
    const printX = side.printArea.x;
    const printY = side.printArea.y;
    const printW = side.printArea.width;
    const printH = side.printArea.height;

    // The exact horizontal center of the print area
    const printCenterX = printX + (printW / 2);

    // Creating the Snap Line (Vertical)
    // Coords: [x1, y1, x2, y2]
    const verticalSnapLine = new fabric.Line(
      [printCenterX, printY, printCenterX, printY + printH],
      {
        stroke: '#FF0072', // Hot pink
        strokeWidth: 1,
        selectable: false,
        evented: false,
        visible: false, // Hidden by default
        excludeFromExport: true // Don't save this in the image
      }
    )
    canvas.add(verticalSnapLine)


    // Creating the clipping mask(invisible, stricly designes where ink can go)
    // Define this area using the printArea data
    const clipPath = new fabric.Rect({
      left: side.printArea.x,
      top: side.printArea.y,
      width: side.printArea.width,
      height: side.printArea.height,
      absolutePositioned: true, // fixes the mask to the canvas ignoring zoom/pan
    })

    // Apply the clipping to the entire canvas
    canvas.clipPath = clipPath;

    // Create the visual guide box (dashed border)
    const guideBox = new fabric.Rect({
      left: side.printArea.x,
      top: side.printArea.y,
      width: side.printArea.width,
      height: side.printArea.height,
      fill: 'transparent',
      stroke: '#fffff',     // Blue border
      strokeWidth: 1,
      strokeDashArray: [5, 5], // Dashed line
      selectable: false,     // Users cannot click/move the border itself
      evented: false,        // Clicks pass through it
      visible: false,        // Hidden by default
      excludeFromExport: true // Don't include this box in the final saved image
    });

    canvas.add(guideBox);

    // Load background image
    fabric.FabricImage.fromURL(side.imageUrl, {crossOrigin:'anonymous'})
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

        canvas.clipPath = undefined;

        canvas.add(img);
        canvas.sendObjectToBack(img); // ensure it stays behind design elements
        // canvas.requestRenderAll();
        canvas.add(guideBox);
      })
      .catch((error) => {
        console.error('Error loading image for', side.name, ':', error);
      });

      // 4. Event Listeners for Visibility Logic
      const showGuide = () => {
        guideBox.set('visible', true);
        canvas.requestRenderAll();
      };

      const hideGuide = () => {
        guideBox.set('visible', false);
        canvas.requestRenderAll();
      };

      // Show when an object is selected
      canvas.on('selection:created', showGuide);
      canvas.on('selection:updated', showGuide);
      
      // Hide when selection is cleared
      canvas.on('selection:cleared', hideGuide);

      // 5. Enforce Clipping on Added Objects
      // Whenever an object is added (Text, Shape, Logo), we apply the clipPath to IT.
      canvas.on('object:added', (e) => {
        const obj = e.target;
        if (!obj || obj === guideBox || obj.type === 'image') return; // Don't clip the guide or the bg shirt

        // Apply the specific clip area to this object
        obj.clipPath = new fabric.Rect({
          left: side.printArea.x,
          top: side.printArea.y,
          width: side.printArea.width,
          height: side.printArea.height,
          absolutePositioned: true,
        });
      })

      const snapThreshold = 10;
      // const printCenterX = side.printArea.x + (side.printArea.width / 2);

      canvas.on('object:moving', (e) => {
        const obj = e.target;
        if (!obj) return; // for error handling if there is no object

        const objCenter = obj.getCenterPoint();

        // 1. Snap: force the object to the center line
        if (Math.abs(objCenter.x - printCenterX) < snapThreshold) {
          obj.setPositionByOrigin(
            new fabric.Point(printCenterX, objCenter.y),
            'center',
            'center'
          );
          verticalSnapLine.set('visible', true);
        } else {
          verticalSnapLine.set('visible', false)
        }
      });

      canvas.on('mouse:up', () => {
        verticalSnapLine.set('visible', false);
        canvas.requestRenderAll();
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
