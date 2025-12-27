
'use client'
import React, {useEffect, useRef, useState} from 'react';
import * as fabric from "fabric";
import { ProductSide } from '@/types/types';
import { useCanvasStore } from '@/store/useCanvasStore';
import ScaleBox from './ScaleBox';
import { formatMm } from '@/lib/canvasUtils';


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

  const { registerCanvas, unregisterCanvas, productColor, markImageLoaded } = useCanvasStore();

  // Scale box state
  const [scaleBoxVisible, setScaleBoxVisible] = useState(false);
  const [scaleBoxDimensions, setScaleBoxDimensions] = useState({
    x: '0mm',
    y: '0mm',
    width: '0mm',
    height: '0mm',
  });
  const [scaleBoxPosition, setScaleBoxPosition] = useState({ x: 0, y: 0 });

  // Update isEdit ref when prop changes
  useEffect(() => {
    isEditRef.current = isEdit;
  }, [isEdit]);

  // Initialize canvas once
  useEffect(() => {
    console.log(`[SingleSideCanvas] Initializing canvas for side: ${side.id}`);
    if (!canvasEl.current) {
      console.error(`[SingleSideCanvas] Canvas element not found for side: ${side.id}`);
      return; // if the canvas element is not initialized properly pass this code
    }

    const canvas = new fabric.Canvas(canvasEl.current, {
      width,
      height,
      backgroundColor: '#f3f3f3', // light gray background for visibility
      preserveObjectStacking: true, // keeps selected objects from jumping to front automatically
      selection: false, // Will be controlled by separate effect based on isEdit
    })

    canvasRef.current = canvas;

    fabric.InteractiveFabricObject.ownDefaults = {
    ...fabric.InteractiveFabricObject.ownDefaults,
    cornerStyle: 'circle',
    cornerColor: 'lightblue',
    transparentCorners: false,
    borderColor: 'blue',
    borderScaleFactor: 1,
}

    // Register this canvas to the global store
    console.log(`[SingleSideCanvas] Registering canvas for side: ${side.id}`);
    registerCanvas(side.id, canvas)
    console.log(`[SingleSideCanvas] Canvas registered for side: ${side.id}`);


    // -- For calculations
    const printW = side.printArea.width;
    const printH = side.printArea.height;

    // Temporary centered position (will be updated when image loads)
    const tempCenteredLeft = (width - printW) / 2;
    const tempCenteredTop = (height - printH) / 2;
    const tempPrintCenterX = tempCenteredLeft + (printW / 2);

    // Creating the Snap Line (Vertical)
    // Coords: [x1, y1, x2, y2]
    const verticalSnapLine = new fabric.Line(
      [tempPrintCenterX, tempCenteredTop, tempPrintCenterX, tempCenteredTop + printH],
      {
        stroke: '#FF0072', // Hot pink
        strokeWidth: 1,
        selectable: false,
        evented: false,
        visible: false, // Hidden by default
        excludeFromExport: true, // Don't save this in the image
        data: {id: 'center-line'}
      }
    )
    canvas.add(verticalSnapLine)


    // Creating the clipping mask(invisible, stricly designes where ink can go)
    // Define this area using the printArea data (will be updated when image loads)
    const clipPath = new fabric.Rect({
      left: tempCenteredLeft,
      top: tempCenteredTop,
      width: side.printArea.width,
      height: side.printArea.height,
      absolutePositioned: true, // fixes the mask to the canvas ignoring zoom/pan
    })

    // Apply the clipping to the entire canvas
    canvas.clipPath = clipPath;

    // Create the visual guide box (dashed border)
    const guideBox = new fabric.Rect({
      left: tempCenteredLeft,
      top: tempCenteredTop,
      width: side.printArea.width,
      height: side.printArea.height,
      fill: 'transparent',
      stroke: '#fffff',     // Blue border
      strokeWidth: 1,
      strokeDashArray: [5, 5], // Dashed line
      selectable: false,     // Users cannot click/move the border itself
      evented: false,        // Clicks pass through it
      visible: false,        // Hidden by default
      excludeFromExport: true, // Don't include this box in the final saved image
      data: {id: 'visual-guide-box'}
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

        // Get zoom scale from side configuration (default to 1.0 if not provided)
        const zoomScale = side.zoomScale || 1.0;

        // for changing the scaling of the image based on the canvas's width and height
        const baseScale = Math.min(width / imgWidth, height / imgHeight);
        const scale = baseScale * zoomScale;

        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          left: width / 2,
          top: height / 2,
          selectable: false, // Users should not be able move the t-shirt itself
          evented: false, // Clicks pass through the objects behind (if any) or canvas
          lockMovementX: true, // Prevent any horizontal movement
          lockMovementY: true, // Prevent any vertical movement
          lockRotation: true, // Prevent rotation
          lockScalingX: true, // Prevent scaling
          lockScalingY: true, // Prevent scaling
          hasControls: false, // Remove all controls
          hasBorders: false, // Remove borders
          data: { id: 'background-product-image' }, // Custom data to identify this as the background
        });

        // Store reference to the product image
        productImageRef.current = img;

        canvas.clipPath = undefined;

        canvas.add(img);
        canvas.sendObjectToBack(img); // ensure it stays behind design elements

        // Apply initial color filter using the current productColor from store
        const currentColor = useCanvasStore.getState().productColor;
        img.filters = [];
        const initialColorFilter = new fabric.filters.BlendColor({
          color: currentColor,
          mode: 'multiply',
          alpha: 1,
        });
        img.filters.push(initialColorFilter);
        img.applyFilters();

        // Mark image as loaded
        markImageLoaded(side.id);
        canvas.requestRenderAll();

        // Calculate print area position relative to the product image
        // The print area coordinates are in the original image pixel space
        // We need to scale them and position them relative to the scaled image

        // Scale the print area dimensions to match the image scale
        const scaledPrintW = side.printArea.width * scale;
        const scaledPrintH = side.printArea.height * scale;
        const scaledPrintX = side.printArea.x * scale;
        const scaledPrintY = side.printArea.y * scale;

        // Calculate the position of the scaled image on the canvas
        // The image is centered, so we need to account for that
        const imageLeft = (width / 2) - (imgWidth * scale / 2);
        const imageTop = (height / 2) - (imgHeight * scale / 2);

        // Position the print area relative to the image position
        const printAreaLeft = imageLeft + scaledPrintX;
        const printAreaTop = imageTop + scaledPrintY;
        const printCenterX = printAreaLeft + (scaledPrintW / 2);

        // Update guide box position to be relative to product image
        guideBox.set({
          left: printAreaLeft,
          top: printAreaTop,
          width: scaledPrintW,
          height: scaledPrintH,
        });

        // Update clip path position
        clipPath.set({
          left: printAreaLeft,
          top: printAreaTop,
          width: scaledPrintW,
          height: scaledPrintH,
        });

        // Update vertical snap line
        verticalSnapLine.set({
          x1: printCenterX,
          y1: printAreaTop,
          x2: printCenterX,
          y2: printAreaTop + scaledPrintH,
        });

        // Store these values for use in event handlers and pricing calculations
        // @ts-expect-error - Adding custom properties to fabric.Canvas for print area tracking
        canvas.printAreaLeft = printAreaLeft;
        // @ts-expect-error - Custom property
        canvas.printAreaTop = printAreaTop;
        // @ts-expect-error - Custom property
        canvas.printAreaWidth = scaledPrintW;
        // @ts-expect-error - Custom property
        canvas.printAreaHeight = scaledPrintH;
        // @ts-expect-error - Custom property
        canvas.printCenterX = printCenterX;

        // Store original and scaled image dimensions for accurate pixel-to-mm conversion
        // @ts-expect-error - Custom property
        canvas.originalImageWidth = imgWidth;
        // @ts-expect-error - Custom property
        canvas.originalImageHeight = imgHeight;
        // @ts-expect-error - Custom property
        canvas.scaledImageWidth = imgWidth * scale;
        // @ts-expect-error - Custom property
        canvas.scaledImageHeight = imgHeight * scale;

        canvas.add(guideBox);
      })
      .catch((error) => {
        console.error('Error loading image for', side.name, ':', error);
      });

      // Helper function to update scale box with object dimensions
      const updateScaleBox = (obj: fabric.FabricObject | fabric.ActiveSelection) => {
        // Get the scaled product image width on the canvas
        // @ts-expect-error - Custom property
        const scaledImageWidth = canvas.scaledImageWidth;
        // @ts-expect-error - Custom property
        const scaledPrintLeft = canvas.printAreaLeft || 0;
        // @ts-expect-error - Custom property
        const scaledPrintTop = canvas.printAreaTop || 0;

        // Get real-world product width from product data
        const realWorldProductWidth = side.realLifeDimensions?.productWidthMm || 500; // Default to 500mm for t-shirts

        // Calculate pixel-to-mm ratio based on the product dimensions, not print area
        // This matches the calculation in canvasPricing.ts for consistency
        const pixelToMmRatio = scaledImageWidth ? realWorldProductWidth / scaledImageWidth : 0.25;

        // Get object's bounding box dimensions (includes scale and rotation)
        // These are in the SCALED canvas coordinate system
        const boundingRect = obj.getBoundingRect();
        const objWidth = boundingRect.width;
        const objHeight = boundingRect.height;

        // Calculate object position relative to print area origin
        // Both values are in the same coordinate space (scaled canvas pixels)
        const objX = boundingRect.left - scaledPrintLeft;
        const objY = boundingRect.top - scaledPrintTop;

        // Convert to mm using the product-based ratio
        // This ensures consistent measurements with the pricing calculation
        const widthMm = objWidth * pixelToMmRatio;
        const heightMm = objHeight * pixelToMmRatio;
        const xMm = objX * pixelToMmRatio;
        const yMm = objY * pixelToMmRatio;

        setScaleBoxDimensions({
          x: formatMm(xMm),
          y: formatMm(yMm),
          width: formatMm(widthMm),
          height: formatMm(heightMm),
        });

        // Position above the object's bounding box at the horizontal center
        setScaleBoxPosition({
          x: boundingRect.left + boundingRect.width / 2,
          y: boundingRect.top - 10,
        });

        setScaleBoxVisible(true);
      };

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
      canvas.on('selection:created', () => {
        showGuide();
        // Get the active object (which could be a single object or ActiveSelection for multiple)
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          updateScaleBox(activeObject);
        }
      });

      canvas.on('selection:updated', () => {
        showGuide();
        // Get the active object (which could be a single object or ActiveSelection for multiple)
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          updateScaleBox(activeObject);
        }
      });

      // Hide when selection is cleared
      canvas.on('selection:cleared', () => {
        hideGuide();
        setScaleBoxVisible(false);
      });

      // 5. Enforce Clipping on Added Objects
      // Whenever an object is added (Text, Shape, Logo), we apply the clipPath to IT.
      canvas.on('object:added', (e) => {
        const obj = e.target;
        // Skip guide boxes, snap lines, and background product image
        // @ts-expect-error - Checking custom data property
        if (!obj || obj.excludeFromExport || (obj.data?.id === 'background-product-image')) return;

        // Apply the specific clip area to this object (using values relative to product image)
        // @ts-expect-error - Custom property
        const printLeft = canvas.printAreaLeft || tempCenteredLeft;
        // @ts-expect-error - Custom property
        const printTop = canvas.printAreaTop || tempCenteredTop;
        // @ts-expect-error - Custom property
        const printWidth = canvas.printAreaWidth || side.printArea.width;
        // @ts-expect-error - Custom property
        const printHeight = canvas.printAreaHeight || side.printArea.height;

        obj.clipPath = new fabric.Rect({
          left: printLeft,
          top: printTop,
          width: printWidth,
          height: printHeight,
          absolutePositioned: true,
        });

        // Make objects selectable based on current edit mode
        obj.selectable = isEditRef.current;
        obj.evented = isEditRef.current;
      })

      const snapThreshold = 10;

      // Update scale box during object transformations
      canvas.on('object:scaling', (e) => {
        if (e.target) {
          updateScaleBox(e.target);
        }
      });

      canvas.on('object:rotating', (e) => {
        if (e.target) {
          updateScaleBox(e.target);
        }
      });

      canvas.on('object:modified', (e) => {
        if (e.target) {
          updateScaleBox(e.target);
        }
      });

      canvas.on('object:moving', (e) => {
        const obj = e.target;
        if (!obj) return; // for error handling if there is no object

        // Update scale box position during movement
        updateScaleBox(obj);

        const objCenter = obj.getCenterPoint();

        // Get the current print center X (will be updated after image loads)
        // @ts-expect-error - Custom property
        const currentPrintCenterX = canvas.printCenterX || tempPrintCenterX;

        // 1. Snap: force the object to the center line
        if (Math.abs(objCenter.x - currentPrintCenterX) < snapThreshold) {
          obj.setPositionByOrigin(
            new fabric.Point(currentPrintCenterX, objCenter.y),
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
  }, [side, height, width, registerCanvas, unregisterCanvas, markImageLoaded]);

  // Separate effect to update selection state when isEdit changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.selection = isEdit;
    canvas.forEachObject((obj) => {
      // Skip guide boxes and snap lines
      if (obj.excludeFromExport) return;

      // Skip the product background image (check by ID)
      // @ts-expect-error - Checking custom data property
      if (obj.data?.id === 'background-product-image') {
        // Ensure background stays locked regardless of edit mode
        obj.selectable = false;
        obj.evented = false;
        return;
      }

      // Make all other objects (including user-added images) selectable/editable
      obj.selectable = isEdit;
      obj.evented = isEdit;
    });
    canvas.requestRenderAll();
  }, [isEdit]);

  // Effect to apply color filter when productColor changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find all objects with id 'background-product-image' and apply color filter
    canvas.forEachObject((obj) => {
      // @ts-expect-error - Checking custom data property
      if (obj.data?.id === 'background-product-image' && obj.type === 'image') {
        const imgObj = obj as fabric.FabricImage;

        // Remove any existing filters
        imgObj.filters = [];

        const colorFilter = new fabric.filters.BlendColor({
          color: productColor,
          mode: 'multiply',
          alpha: 1, // Adjust opacity of the color overlay
        });

        imgObj.filters.push(colorFilter);
        imgObj.applyFilters();
      }
    });

    canvas.requestRenderAll();
  }, [productColor]);

  return (
    <div className="relative">
      <canvas ref={canvasEl}/>
      <ScaleBox
        x={scaleBoxDimensions.x}
        y={scaleBoxDimensions.y}
        width={scaleBoxDimensions.width}
        height={scaleBoxDimensions.height}
        position={scaleBoxPosition}
        visible={scaleBoxVisible}
      />
    </div>
  )
}

export default SingleSideCanvas;
