
'use client'
import React, {useEffect, useRef} from 'react';
import * as fabric from "fabric";
import { ProductSide } from '@/types/types';
import { useCanvasStore } from '@/store/useCanvasStore';


interface SingleSideCanvasProps {
  side: ProductSide;
  width?: number; // these are optional because there will be a default value
  height?: number; // ''
  isEdit?: boolean; // whether canvas is in edit mode
}

const SingleSideCanvas: React.FC<SingleSideCanvasProps> = ({
  side,
  width = 500,
  height = 500,
  isEdit = false
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const isEditRef = useRef(isEdit);
  const productImageRef = useRef<fabric.FabricImage | null>(null);

  const { registerCanvas, unregisterCanvas, productColor } = useCanvasStore();

  // Update isEdit ref when prop changes
  useEffect(() => {
    isEditRef.current = isEdit;
  }, [isEdit]);

  // Initialize canvas once
  useEffect(() => {
    if (!canvasEl.current) return; // if the canvas element is not initialized properly pass this code

    const canvas = new fabric.Canvas(canvasEl.current, {
      width,
      height,
      backgroundColor: '#f3f3f3', // light gray background for visibility
      preserveObjectStacking: true, // keeps selected objects from jumping to front automatically
      selection: false, // Will be controlled by separate effect based on isEdit
    })

    canvasRef.current = canvas;

    // Register this canvas to the global store
    registerCanvas(side.id, canvas)


    // -- For calculations
    const printW = side.printArea.width;
    const printH = side.printArea.height;

    // Calculate centered position for the print area
    const centeredLeft = (width - printW) / 2;
    const centeredTop = (height - printH) / 2;

    // The exact horizontal center of the print area (using centered position)
    const printCenterX = centeredLeft + (printW / 2);

    // Creating the Snap Line (Vertical)
    // Coords: [x1, y1, x2, y2]
    const verticalSnapLine = new fabric.Line(
      [printCenterX, centeredTop, printCenterX, centeredTop + printH],
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
    // Define this area using the printArea data, centered on canvas
    const clipPath = new fabric.Rect({
      left: centeredLeft,
      top: centeredTop,
      width: side.printArea.width,
      height: side.printArea.height,
      absolutePositioned: true, // fixes the mask to the canvas ignoring zoom/pan
    })

    // Apply the clipping to the entire canvas
    canvas.clipPath = clipPath;

    // Create the visual guide box (dashed border)
    const guideBox = new fabric.Rect({
      left: centeredLeft,
      top: centeredTop,
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
        const scale = Math.min(width / imgWidth, height / imgHeight);

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

        // Store reference to the product image
        productImageRef.current = img;

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
        if (!obj || obj === guideBox || obj === productImageRef.current) return; // Don't clip the guide or the bg shirt

        // Apply the specific clip area to this object (using centered position)
        obj.clipPath = new fabric.Rect({
          left: centeredLeft,
          top: centeredTop,
          width: side.printArea.width,
          height: side.printArea.height,
          absolutePositioned: true,
        });

        // Make objects selectable based on current edit mode
        obj.selectable = isEditRef.current;
        obj.evented = isEditRef.current;
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
      canvasRef.current = null;
    };
  }, [side, height, width, registerCanvas, unregisterCanvas]);

  // Separate effect to update selection state when isEdit changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.selection = isEdit;
    canvas.forEachObject((obj) => {
      if (obj.type !== 'image' && !obj.excludeFromExport) {
        obj.selectable = isEdit;
        obj.evented = isEdit;
      }
    });
    canvas.requestRenderAll();
  }, [isEdit]);

  // Effect to apply color filter when productColor changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const productImage = productImageRef.current;

    if (!canvas || !productImage) return;

    // Remove any existing filters
    productImage.filters = [];

    // Apply color overlay filter if color is not white
    if (productColor && productColor !== '#FFFFFF') {
      const colorFilter = new fabric.filters.BlendColor({
        color: productColor,
        mode: 'multiply',
        alpha: 0.5, // Adjust opacity of the color overlay
      });

      productImage.filters.push(colorFilter);
    }

    // Apply the filters and render
    productImage.applyFilters();
    canvas.requestRenderAll();
  }, [productColor]);

  return (
    <div className="">
      <canvas ref={canvasEl}/>
    </div>
  )
}

export default SingleSideCanvas;
