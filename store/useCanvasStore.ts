import { create } from 'zustand';
import * as fabric from 'fabric';
import { extractAllColors } from '@/lib/colorExtractor';


interface CanvasState {
  // Aplication State
  activeSideId: string;
  setActiveSide: (id: string) => void;

  // Edit mode state
  isEditMode: boolean;
  setEditMode: (isEdit: boolean) => void;

  // Product color state
  productColor: string;
  setProductColor: (color: string) => void;

  // Layer color state - maps sideId -> layerId -> hex color
  layerColors: Record<string, Record<string, string>>;
  setLayerColor: (sideId: string, layerId: string, color: string) => void;
  getLayerColor: (sideId: string, layerId: string) => string | null;
  initializeLayerColors: (sideId: string, layers: { id: string; colorOptions: string[] }[]) => void;

  canvasMap: Record<string, fabric.Canvas>;
  registerCanvas: (id: string, cavas: fabric.Canvas) => void;
  unregisterCanvas: (id: string) => void;

  getActiveCanvas: () => fabric.Canvas | null;

  // Canvas change tracking
  canvasVersion: number;
  incrementCanvasVersion: () => void;

  // Image loading tracking
  imageLoadedMap: Record<string, boolean>;
  markImageLoaded: (id: string) => void;
  isImageLoaded: (id: string) => boolean;

  // Serialization methods
  saveAllCanvasState: () => Record<string, string>;
  restoreAllCanvasState: (savedState: Record<string, string>) => Promise<void>;
  saveCanvasState: (id: string) => string | null;
  restoreCanvasState: (id: string, json: string) => Promise<void>;

  // Color extraction methods
  getCanvasColors: (sensitivity?: number) => Promise<{ colors: string[]; count: number }>;

  // Print option methods
  setObjectPrintMethod: (objectId: string, method: 'embroidery' | 'printing') => void;
  getObjectPrintMethod: (object: fabric.FabricObject) => 'embroidery' | 'printing' | null;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  activeSideId: 'front',
  canvasMap: {},
  imageLoadedMap: {},
  isEditMode: false,
  productColor: '#FFFFFF', // Default mix gray color
  canvasVersion: 0,
  layerColors: {},
  setActiveSide: (id) => set({ activeSideId: id}),
  setEditMode: (isEdit) => set({ isEditMode: isEdit }),
  setProductColor: (color) => set({ productColor: color }),
  incrementCanvasVersion: () => set((state) => ({ canvasVersion: state.canvasVersion + 1 })),

  // Layer color management
  setLayerColor: (sideId, layerId, color) => {
    set((state) => ({
      layerColors: {
        ...state.layerColors,
        [sideId]: {
          ...state.layerColors[sideId],
          [layerId]: color
        }
      }
    }));
  },

  getLayerColor: (sideId, layerId) => {
    const { layerColors } = get();
    return layerColors[sideId]?.[layerId] || null;
  },

  initializeLayerColors: (sideId, layers) => {
    set((state) => {
      const sideColors = { ...state.layerColors[sideId] };
      layers.forEach(layer => {
        // Only initialize if not already set
        if (!sideColors[layer.id] && layer.colorOptions.length > 0) {
          sideColors[layer.id] = layer.colorOptions[0];
        }
      });
      return {
        layerColors: {
          ...state.layerColors,
          [sideId]: sideColors
        }
      };
    });
  },

  markImageLoaded: (id) => {
    set((state) => ({
      imageLoadedMap: { ...state.imageLoadedMap, [id]: true }
    }));
  },

  isImageLoaded: (id) => {
    const { imageLoadedMap } = get();
    return imageLoadedMap[id] || false;
  },

  registerCanvas: (id, canvas) => {
    set((state) => {
      const newMap = { ...state.canvasMap };
      newMap[id] = canvas;
      return { canvasMap: newMap };
    });
  },

  unregisterCanvas: (id) => {
    set((state) => {
      const newMap = { ...state.canvasMap };
      const newImageLoadedMap = { ...state.imageLoadedMap };
      delete newMap[id];
      delete newImageLoadedMap[id];
      return { canvasMap: newMap, imageLoadedMap: newImageLoadedMap };
    })
  },

  getActiveCanvas: () => {
    const {canvasMap, activeSideId} = get();
    return canvasMap[activeSideId] || null;
  },

  // Save state of all canvases as JSON strings
  saveAllCanvasState: () => {
    const { canvasMap } = get();
    const savedState: Record<string, string> = {};

    Object.entries(canvasMap).forEach(([id, canvas]) => {
      // Save user-added objects (exclude background product image, guides, and snap lines)
      // User-added images should be saved
      const userObjects = canvas.getObjects().filter(obj => {
        // Exclude guide boxes and snap lines
        if (obj.excludeFromExport) return false;

        // Exclude the background product image by checking its ID
        // @ts-expect-error - Checking custom data property
        if (obj.data?.id === 'background-product-image') return false;

        return true;
      });

      // Create a minimal JSON with only user objects
      const canvasData = {
        version: canvas.toJSON().version,
        objects: userObjects.map(obj => {
          // Use toObject to include custom properties
          const json = obj.toObject(['data']);
          // For image objects, ensure we preserve the src
          if (obj.type === 'image') {
            const imgObj = obj as fabric.FabricImage;
            json.src = imgObj.getSrc();
          }
          return json;
        })
      };

      savedState[id] = JSON.stringify(canvasData);
    });

    return savedState;
  },

  // Restore all canvases from saved state
  restoreAllCanvasState: async (savedState: Record<string, string>) => {
    const { canvasMap, isEditMode } = get();

    const restorePromises = Object.entries(savedState).map(([id, json]) => {
      const canvas = canvasMap[id];
      if (!canvas) return Promise.resolve();

      return new Promise<void>((resolve) => {
        // First, remove only user-added objects (keep background product image and guides)
        const objectsToRemove = canvas.getObjects().filter(obj => {
          // Keep guide boxes and snap lines
          if (obj.excludeFromExport) return false;

          // Keep the background product image by checking its ID
          // @ts-expect-error - Checking custom data property
          if (obj.data?.id === 'background-product-image') return false;

          // Remove all other user-added objects
          return true;
        });
        objectsToRemove.forEach(obj => canvas.remove(obj));

        // Then load the saved user objects
        const canvasData = JSON.parse(json);

        if (canvasData.objects && canvasData.objects.length > 0) {
          fabric.util.enlivenObjects(canvasData.objects).then((objects) => {
            objects.forEach((obj) => {
              if (obj && typeof obj === 'object' && 'type' in obj) {
                const fabricObj = obj as fabric.FabricObject;

                canvas.add(fabricObj);

                // Set interactivity AFTER adding to canvas
                // This ensures the properties are applied after canvas event handlers
                fabricObj.set({
                  selectable: isEditMode,
                  evented: isEditMode
                });
              }
            });
            canvas.requestRenderAll();
            resolve();
          });
        } else {
          canvas.requestRenderAll();
          resolve();
        }
      });
    });

    await Promise.all(restorePromises);
  },

  // Save state of a specific canvas
  saveCanvasState: (id: string) => {
    const { canvasMap } = get();
    const canvas = canvasMap[id];

    if (!canvas) return null;

    // Save user-added objects (exclude background product image, guides, and snap lines)
    const userObjects = canvas.getObjects().filter(obj => {
      // Exclude guide boxes and snap lines
      if (obj.excludeFromExport) return false;

      // Exclude the background product image by checking its ID
      // @ts-expect-error - Checking custom data property
      if (obj.data?.id === 'background-product-image') return false;

      return true;
    });

    // Create a minimal JSON with only user objects
    const canvasData = {
      version: canvas.toJSON().version,
      objects: userObjects.map(obj => {
        // Use toObject to include custom properties
        const json = obj.toObject(['data']);
        // For image objects, ensure we preserve the src
        if (obj.type === 'image') {
          const imgObj = obj as fabric.FabricImage;
          json.src = imgObj.getSrc();
        }
        return json;
      })
    };

    return JSON.stringify(canvasData);
  },

  // Restore a specific canvas from JSON
  restoreCanvasState: async (id: string, json: string) => {
    const { canvasMap, isEditMode } = get();
    const canvas = canvasMap[id];

    if (!canvas) return;

    return new Promise<void>((resolve) => {
      // First, remove only user-added objects (keep background product image and guides)
      const objectsToRemove = canvas.getObjects().filter(obj => {
        // Keep guide boxes and snap lines
        if (obj.excludeFromExport) return false;

        // Keep the background product image by checking its ID
        // @ts-expect-error - Checking custom data property
        if (obj.data?.id === 'background-product-image') return false;

        // Remove all other user-added objects
        return true;
      });
      objectsToRemove.forEach(obj => canvas.remove(obj));

      // Then load the saved user objects
      const canvasData = JSON.parse(json);

      if (canvasData.objects && canvasData.objects.length > 0) {
        fabric.util.enlivenObjects(canvasData.objects).then((objects) => {
          objects.forEach((obj) => {
            if (obj && typeof obj === 'object' && 'type' in obj) {
              const fabricObj = obj as fabric.FabricObject;

              canvas.add(fabricObj);

              // Set interactivity AFTER adding to canvas
              fabricObj.set({
                selectable: isEditMode,
                evented: isEditMode
              });
            }
          });
          canvas.requestRenderAll();
          resolve();
        });
      } else {
        canvas.requestRenderAll();
        resolve();
      }
    });
  },

  // Get all colors used in canvas objects (excluding background images)
  getCanvasColors: async (sensitivity: number = 30) => {
    const { canvasMap } = get();
    return await extractAllColors(canvasMap, sensitivity);
  },

  // Set print method for a specific object
  setObjectPrintMethod: (objectId: string, method: 'embroidery' | 'printing') => {
    const { getActiveCanvas, incrementCanvasVersion } = get();
    const canvas = getActiveCanvas();
    if (!canvas) return;

    // Find the object by ID
    const objects = canvas.getObjects();
    const targetObject = objects.find(obj => {
      // @ts-expect-error - Checking custom data property
      return obj.data?.objectId === objectId;
    });

    if (targetObject) {
      // @ts-expect-error - Setting custom data property
      if (!targetObject.data) targetObject.data = {};
      // @ts-expect-error - Setting custom data property
      targetObject.data.printMethod = method;

      // Trigger canvas version update for pricing recalculation
      incrementCanvasVersion();
      canvas.requestRenderAll();
    }
  },

  // Get print method for a specific object
  getObjectPrintMethod: (object: fabric.FabricObject): 'embroidery' | 'printing' | null => {
    // @ts-expect-error - Checking custom data property
    return object.data?.printMethod || null;
  },
}));
