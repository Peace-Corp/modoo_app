
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
  const layerImagesRef = useRef<Map<string, fabric.FabricImage>>(new Map());

  const { registerCanvas, unregisterCanvas, productColor, markImageLoaded, incrementCanvasVersion, initializeLayerColors, layerColors, resetZoom } = useCanvasStore();

  // Loading state to track when all images are loaded
  const [isLoading, setIsLoading] = useState(true);

  // Track when layers are fully loaded and ready for color application
  const [layersReady, setLayersReady] = useState(false);

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

  // Reset layersReady when side changes
  useEffect(() => {
    setLayersReady(false);
  }, [side.id]);

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

    // Check if side has layers (multi-layer mode) or single imageUrl (legacy mode)
    const hasLayers = side.layers && side.layers.length > 0;

    // Creating the Snap Line (Vertical)
    // For multi-layer mode: use canvas center
    // For single-image mode: use print area center (will be updated when image loads)
    const snapLineCenterX = hasLayers ? width / 2 : tempPrintCenterX;
    const snapLineTop = hasLayers ? 0 : tempCenteredTop;
    const snapLineBottom = hasLayers ? height : tempCenteredTop + printH;

    const verticalSnapLine = new fabric.Line(
      [snapLineCenterX, snapLineTop, snapLineCenterX, snapLineBottom],
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

    if (hasLayers) {
      // Multi-layer mode: Initialize layer colors and load all layers
      initializeLayerColors(side.id, side.layers!);

      // Disable canvas-level clipping for multi-layer mode
      // Individual objects will be clipped via object:added event handler
      canvas.clipPath = undefined;

      // Sort layers by zIndex
      const sortedLayers = [...side.layers!].sort((a, b) => a.zIndex - b.zIndex);

      // Helper function to ensure image is fully loaded and decoded
      const ensureImageFullyLoaded = async (imageUrl: string, layerName: string, layerId: string): Promise<fabric.FabricImage | null> => {
        try {
          // First, load the image using Fabric.js
          const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });

          if (!img) {
            console.error(`[SingleSideCanvas] Failed to load layer image: ${imageUrl} for layer: ${layerName} (${layerId})`);
            return null;
          }

          // Get the underlying HTMLImageElement
          const imgElement = img.getElement() as HTMLImageElement;

          // Ensure the image is fully loaded
          if (!imgElement.complete) {
            console.log(`[SingleSideCanvas] Waiting for image to complete loading: ${layerName} (${layerId})`);
            await new Promise<void>((resolve, reject) => {
              imgElement.onload = () => resolve();
              imgElement.onerror = () => reject(new Error('Image failed to load'));
              // Add timeout to prevent infinite waiting
              setTimeout(() => reject(new Error('Image load timeout')), 30000);
            });
          }

          // Use the decode() API to ensure the image is fully decoded
          // This is crucial for preventing partial renders
          if (imgElement.decode) {
            console.log(`[SingleSideCanvas] Decoding image: ${layerName} (${layerId})`);
            await imgElement.decode();
            console.log(`[SingleSideCanvas] Image decoded successfully: ${layerName} (${layerId})`);
          }

          // Verify dimensions after decode
          const imgWidth = img.width || 0;
          const imgHeight = img.height || 0;

          if (imgWidth === 0 || imgHeight === 0) {
            console.error(`[SingleSideCanvas] Layer image has invalid dimensions after decode: ${imgWidth}x${imgHeight} for layer: ${layerName} (${layerId})`);
            return null;
          }

          console.log(`[SingleSideCanvas] Image fully loaded and decoded: ${layerName} (${layerId}) - ${imgWidth}x${imgHeight}`);
          return img;
        } catch (error) {
          console.error(`[SingleSideCanvas] Error ensuring image fully loaded for ${layerName} (${layerId}):`, error);
          return null;
        }
      };

      // Load all layer images with guaranteed full loading
      const layerLoadPromises = sortedLayers.map(async (layer) => {
        try {
          const img = await ensureImageFullyLoaded(layer.imageUrl, layer.name, layer.id);

          if (!img) {
            return null;
          }

          // Scale the image to fit the canvas
          const imgWidth = img.width || 0;
          const imgHeight = img.height || 0;

          // Get zoom scale from side configuration
          const zoomScale = side.zoomScale || 1.0;
          const baseScale = Math.min(width / imgWidth, height / imgHeight);
          const scale = baseScale * zoomScale;

          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: width / 2,
            top: height / 2,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
            data: {
              id: 'background-product-image',
              layerId: layer.id
            },
          });

          // Store reference to this layer image (before applying filters)
          layerImagesRef.current.set(layer.id, img);

          console.log(`[SingleSideCanvas] Successfully configured layer: ${layer.name} (${layer.id}) with dimensions ${imgWidth}x${imgHeight} for side: ${side.id}`);
          return { img, scale, imgWidth, imgHeight, layer };
        } catch (error) {
          // Catch individual layer loading errors to prevent one failure from breaking all layers
          console.error(`[SingleSideCanvas] Error loading layer: ${layer.name} (${layer.id}) from ${layer.imageUrl}`, error);
          return null;
        }
      });

      // Wait for all layers to load
      Promise.all(layerLoadPromises).then((results) => {
        const validResults = results.filter(r => r !== null);
        if (validResults.length === 0) {
          console.error('[SingleSideCanvas] No valid layer images loaded');
          setIsLoading(false);
          return;
        }

        console.log(`[SingleSideCanvas] ${validResults.length}/${sortedLayers.length} layer images loaded successfully for side: ${side.id}`);

        // Use the first layer's dimensions for calculations
        const firstResult = validResults[0]!;
        const { scale, imgWidth, imgHeight } = firstResult;

        // Add all layer images to canvas in z-index order (bottom to top)
        console.log(`[SingleSideCanvas] Adding ${sortedLayers.length} layers to canvas for side: ${side.id}`);

        let addedLayerCount = 0;

        // Add layers to canvas FIRST without color filters
        // Color filters will be applied by the effect after all layers are confirmed loaded
        sortedLayers.forEach((layer) => {
          const layerImg = layerImagesRef.current.get(layer.id);
          if (layerImg) {
            canvas.add(layerImg);
            addedLayerCount++;
            console.log(`[SingleSideCanvas] Added layer ${layer.name} (${layer.id}) to canvas`);
          } else {
            console.error(`[SingleSideCanvas] Layer image not found in ref for ${layer.name} (${layer.id})`);
          }
        });

        // Verify all layers were added
        if (addedLayerCount !== validResults.length) {
          console.error(`[SingleSideCanvas] Layer count mismatch: Added ${addedLayerCount} but expected ${validResults.length}`);
        }

        // Send all layers to the back in reverse order to maintain zIndex
        // This ensures layers are at the very bottom, below guide elements
        for (let i = sortedLayers.length - 1; i >= 0; i--) {
          const layer = sortedLayers[i];
          const layerImg = layerImagesRef.current.get(layer.id);
          if (layerImg) {
            canvas.sendObjectToBack(layerImg);
            console.log(`[SingleSideCanvas] Sent layer ${layer.name} (${layer.id}) to back`);
          }
        }

        // Debug: Log all objects on canvas
        console.log(`[SingleSideCanvas] Canvas now has ${canvas.getObjects().length} objects:`,
          canvas.getObjects().map((obj, i) => ({
            index: i,
            type: obj.type,
            // @ts-expect-error - Checking custom data property
            id: obj.data?.id,
            // @ts-expect-error - Checking custom data property
            layerId: obj.data?.layerId
          })));

        // Calculate print area position relative to the first layer
        const scaledPrintW = side.printArea.width * scale;
        const scaledPrintH = side.printArea.height * scale;
        const scaledPrintX = side.printArea.x * scale;
        const scaledPrintY = side.printArea.y * scale;

        const imageLeft = (width / 2) - (imgWidth * scale / 2);
        const imageTop = (height / 2) - (imgHeight * scale / 2);

        const printAreaLeft = imageLeft + scaledPrintX;
        const printAreaTop = imageTop + scaledPrintY;
        const printCenterX = printAreaLeft + (scaledPrintW / 2);

        // Update guide box position
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
        // For multi-layer mode, keep it at canvas center spanning full height
        verticalSnapLine.set({
          x1: width / 2,
          y1: 0,
          x2: width / 2,
          y2: height,
        });

        // Store values for use in event handlers
        // @ts-expect-error - Adding custom properties
        canvas.printAreaLeft = printAreaLeft;
        // @ts-expect-error - Custom property
        canvas.printAreaTop = printAreaTop;
        // @ts-expect-error - Custom property
        canvas.printAreaWidth = scaledPrintW;
        // @ts-expect-error - Custom property
        canvas.printAreaHeight = scaledPrintH;
        // @ts-expect-error - Custom property
        canvas.printCenterX = printCenterX;
        // @ts-expect-error - Custom property
        canvas.originalImageWidth = imgWidth;
        // @ts-expect-error - Custom property
        canvas.originalImageHeight = imgHeight;
        // @ts-expect-error - Custom property
        canvas.scaledImageWidth = imgWidth * scale;
        // @ts-expect-error - Custom property
        canvas.scaledImageHeight = imgHeight * scale;

        // For multi-layer mode, store canvas center as the snap center
        // @ts-expect-error - Custom property
        canvas.printCenterX = width / 2;

        // Don't add guide box for multi-layer mode
        // canvas.add(guideBox); // Skipped for multi-layer mode

        // Force a render to ensure all objects are processed by Fabric.js
        canvas.requestRenderAll();

        // Wait for next animation frame to ensure Fabric.js has completed rendering
        // This guarantees all layer images are properly initialized before showing the canvas
        requestAnimationFrame(() => {
          // Verify all layers are actually rendered on the canvas
          const canvasObjects = canvas.getObjects();
          const layerObjectsOnCanvas = canvasObjects.filter(obj => {
            // @ts-expect-error - Checking custom data property
            return obj.data?.id === 'background-product-image';
          });

          console.log(`[SingleSideCanvas] Verification: ${layerObjectsOnCanvas.length} layer objects rendered on canvas`);

          if (layerObjectsOnCanvas.length !== addedLayerCount) {
            console.warn(`[SingleSideCanvas] Canvas render verification failed: Expected ${addedLayerCount} layers but found ${layerObjectsOnCanvas.length}`);
          }

          // Mark image as loaded in store
          markImageLoaded(side.id);

          // All layers loaded, added, and rendered - mark as ready
          // Set layersReady to trigger the color application effect
          setLayersReady(true);
          setIsLoading(false);
          console.log(`[SingleSideCanvas] All layers loaded and rendered for side: ${side.id} ✓`);
        });
      }).catch((error) => {
        console.error('[SingleSideCanvas] Error loading layer images:', error);
        setIsLoading(false);
      });
    } else {
      // Legacy single-image mode: use imageUrl
      const imageUrl = side.imageUrl;
      if (!imageUrl) {
        console.error('Side has no imageUrl or layers');
        setIsLoading(false);
        return;
      }

      // Helper function to ensure single image is fully loaded and decoded
      const loadSingleImage = async () => {
        try {
          // First, load the image using Fabric.js
          const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });

          if (!img) {
            console.error('[SingleSideCanvas] Failed to load image:', side.imageUrl);
            return null;
          }

          // Get the underlying HTMLImageElement
          const imgElement = img.getElement() as HTMLImageElement;

          // Ensure the image is fully loaded
          if (!imgElement.complete) {
            console.log(`[SingleSideCanvas] Waiting for single image to complete loading for side: ${side.id}`);
            await new Promise<void>((resolve, reject) => {
              imgElement.onload = () => resolve();
              imgElement.onerror = () => reject(new Error('Image failed to load'));
              // Add timeout to prevent infinite waiting
              setTimeout(() => reject(new Error('Image load timeout')), 30000);
            });
          }

          // Use the decode() API to ensure the image is fully decoded
          if (imgElement.decode) {
            console.log(`[SingleSideCanvas] Decoding single image for side: ${side.id}`);
            await imgElement.decode();
            console.log(`[SingleSideCanvas] Single image decoded successfully for side: ${side.id}`);
          }

          // Verify dimensions after decode
          const imgWidth = img.width || 0;
          const imgHeight = img.height || 0;

          if (imgWidth === 0 || imgHeight === 0) {
            console.error('[SingleSideCanvas] Image has invalid dimensions after decode:', imgWidth, 'x', imgHeight);
            return null;
          }

          console.log(`[SingleSideCanvas] Single image fully loaded and decoded with dimensions ${imgWidth}x${imgHeight} for side: ${side.id}`);
          return img;
        } catch (error) {
          console.error('[SingleSideCanvas] Error loading single image for', side.name, ':', error);
          return null;
        }
      };

      loadSingleImage().then((img) => {
        if (!img) {
          setIsLoading(false);
          return;
        }

        // Scale the image to fit the canvas (basically contains the image inside the canvas)
        const imgWidth = img.width || 0;
        const imgHeight = img.height || 0;

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

        // Force a render to ensure all objects are processed by Fabric.js
        canvas.requestRenderAll();

        // Wait for next animation frame to ensure Fabric.js has completed rendering
        // This guarantees the image is properly initialized before showing the canvas
        requestAnimationFrame(() => {
          // Verify the image is actually rendered on the canvas
          const canvasObjects = canvas.getObjects();
          const productImageOnCanvas = canvasObjects.find(obj => {
            // @ts-expect-error - Checking custom data property
            return obj.data?.id === 'background-product-image';
          });

          if (!productImageOnCanvas) {
            console.warn('[SingleSideCanvas] Canvas render verification failed: Product image not found on canvas');
          } else {
            console.log('[SingleSideCanvas] Verification: Product image successfully rendered on canvas');
          }

          // Mark image as loaded in store
          markImageLoaded(side.id);

          // Single image loaded and rendered - mark as ready
          setIsLoading(false);
          console.log(`[SingleSideCanvas] Single image loaded and rendered for side: ${side.id} ✓`);
        });
      })
      .catch((error) => {
        console.error('[SingleSideCanvas] Error loading image for', side.name, ':', error);
        setIsLoading(false);
      });
    }

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
    // Only show guide box for single-image mode (not multi-layer mode)
    const showGuide = () => {
        if (!hasLayers) {
          guideBox.set('visible', true);
          canvas.requestRenderAll();
        }
    };

    const hideGuide = () => {
        if (!hasLayers) {
          guideBox.set('visible', false);
          canvas.requestRenderAll();
        }
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
    // Skip clipping entirely for multi-layer mode
    canvas.on('object:added', (e) => {
        const obj = e.target;
        // Skip guide boxes, snap lines, and background product image
        // @ts-expect-error - Checking custom data property
        if (!obj || obj.excludeFromExport || (obj.data?.id === 'background-product-image')) return;

        // Assign a unique ID to each user-added object if it doesn't have one
        // @ts-expect-error - Setting custom data property
        if (!obj.data) obj.data = {};
        // @ts-expect-error - Setting custom data property
        if (!obj.data.objectId) {
          // @ts-expect-error - Setting custom data property
          obj.data.objectId = `${side.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Set default print method for non-image objects
        // @ts-expect-error - Checking custom data property
        if (obj.type !== 'image' && !obj.data.printMethod) {
          // @ts-expect-error - Setting custom data property
          obj.data.printMethod = 'printing'; // Default to printing
        }

        // Only apply clipping in single-image mode (not multi-layer mode)
        if (!hasLayers) {
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
        }

        // Make objects selectable based on current edit mode
        obj.selectable = isEditRef.current;
        obj.evented = isEditRef.current;

        // Increment canvas version to trigger updates in components that depend on canvas state
        incrementCanvasVersion();
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
        // Increment canvas version when object is modified (color, size, etc.)
        incrementCanvasVersion();
    });

    // Increment canvas version when object is removed
    canvas.on('object:removed', (e) => {
        const obj = e.target;
        // Skip guide boxes, snap lines, and background product image
        // @ts-expect-error - Checking custom data property
        if (!obj || obj.excludeFromExport || (obj.data?.id === 'background-product-image')) return;

        incrementCanvasVersion();
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
  }, [side, height, width, registerCanvas, unregisterCanvas, markImageLoaded, incrementCanvasVersion]);

  // Separate effect to update selection state when isEdit changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset zoom when entering or exiting edit mode
    resetZoom(side.id);

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
  }, [isEdit, side.id, resetZoom]);

  // Effect to apply color filter when productColor changes (legacy single-image mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only apply in legacy mode (when side has no layers)
    if (side.layers && side.layers.length > 0) return;

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
  }, [productColor, side.layers]);

  // Effect to apply color filter to layers when layerColors change or layers are ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only apply in multi-layer mode
    if (!side.layers || side.layers.length === 0) return;

    // Wait for layers to be loaded before applying colors
    if (!layersReady) {
      console.log(`[SingleSideCanvas] Waiting for layers to be ready before applying colors for side: ${side.id}`);
      return;
    }

    console.log(`[SingleSideCanvas] Applying color filters to ${side.layers.length} layers for side: ${side.id}`);

    // Build a lookup of layerId -> images on canvas to handle duplicates reliably
    const layerImagesById = new Map<string, fabric.FabricImage[]>();
    canvas.getObjects().forEach((obj) => {
      if (obj.type !== 'image') return;
      // @ts-expect-error - Checking custom data property
      const dataId = obj.data?.id;
      // @ts-expect-error - Checking custom data property
      const dataLayerId = obj.data?.layerId as string | undefined;
      if (dataId !== 'background-product-image' || !dataLayerId) return;
      const list = layerImagesById.get(dataLayerId) || [];
      list.push(obj as fabric.FabricImage);
      layerImagesById.set(dataLayerId, list);
    });

    // Update each layer's color based on layerColors state
    let colorsApplied = 0;
    side.layers.forEach((layer) => {
      const canvasLayerImages = layerImagesById.get(layer.id) || [];
      const refLayerImage = layerImagesRef.current.get(layer.id);
      const layerImages = canvasLayerImages.length > 0
        ? canvasLayerImages
        : (refLayerImage ? [refLayerImage] : []);

      if (layerImages.length === 0) {
        console.warn(`[SingleSideCanvas] Layer image not found for ${layer.name} (${layer.id}) when applying colors`);
        return;
      }

      const selectedColor = layerColors[side.id]?.[layer.id] || layer.colorOptions[0] || '#FFFFFF';

      layerImages.forEach((layerImg) => {
        // Remove any existing filters
        layerImg.filters = [];

        const colorFilter = new fabric.filters.BlendColor({
          color: selectedColor,
          mode: 'multiply',
          alpha: 1,
        });

        layerImg.filters.push(colorFilter);
        layerImg.applyFilters();
        colorsApplied++;
      });

      console.log(`[SingleSideCanvas] Applied color ${selectedColor} to ${layerImages.length} image(s) for layer ${layer.name} (${layer.id})`);
    });

    console.log(`[SingleSideCanvas] Successfully applied colors to ${colorsApplied}/${side.layers.length} layers for side: ${side.id}`);

    canvas.requestRenderAll();
  }, [layerColors, side.id, side.layers, layersReady]);

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          style={{ width, height }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600">Loading canvas...</p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasEl}
        style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}
      />
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
