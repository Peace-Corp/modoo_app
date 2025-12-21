import { create } from 'zustand';
import * as fabric from 'fabric';


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

  canvasMap: Record<string, fabric.Canvas>;
  registerCanvas: (id: string, cavas: fabric.Canvas) => void;
  unregisterCanvas: (id: string) => void;

  getActiveCanvas: () => fabric.Canvas | null;

  // Serialization methods
  saveAllCanvasState: () => Record<string, string>;
  restoreAllCanvasState: (savedState: Record<string, string>) => Promise<void>;
  saveCanvasState: (id: string) => string | null;
  restoreCanvasState: (id: string, json: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  activeSideId: 'front',
  canvasMap: {},
  isEditMode: false,
  productColor: '#9CA3AF', // Default mix gray color
  setActiveSide: (id) => set({ activeSideId: id}),
  setEditMode: (isEdit) => set({ isEditMode: isEdit }),
  setProductColor: (color) => set({ productColor: color }),

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
      delete newMap[id];
      return { canvasMap: newMap };
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

        // Exclude the background product image (it's always the bottom-most image)
        // User-added images will be on top of it
        if (obj.type === 'image') {
          // Check if this is the background by seeing if it's at the bottom
          const objects = canvas.getObjects();
          const imageIndex = objects.indexOf(obj);
          // If it's the first image object, it's likely the background
          const firstImageIndex = objects.findIndex(o => o.type === 'image');
          return imageIndex !== firstImageIndex;
        }

        return true;
      });

      // Create a minimal JSON with only user objects
      const canvasData = {
        version: canvas.toJSON().version,
        objects: userObjects.map(obj => {
          const json = obj.toJSON();
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

          // Keep the background product image (it's the first/bottom-most image)
          if (obj.type === 'image') {
            const objects = canvas.getObjects();
            const imageIndex = objects.indexOf(obj);
            const firstImageIndex = objects.findIndex(o => o.type === 'image');
            // Remove user-added images (not the first one)
            return imageIndex !== firstImageIndex;
          }

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

      // Exclude the background product image (it's always the bottom-most image)
      if (obj.type === 'image') {
        const objects = canvas.getObjects();
        const imageIndex = objects.indexOf(obj);
        const firstImageIndex = objects.findIndex(o => o.type === 'image');
        return imageIndex !== firstImageIndex;
      }

      return true;
    });

    // Create a minimal JSON with only user objects
    const canvasData = {
      version: canvas.toJSON().version,
      objects: userObjects.map(obj => {
        const json = obj.toJSON();
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

        // Keep the background product image (it's the first/bottom-most image)
        if (obj.type === 'image') {
          const objects = canvas.getObjects();
          const imageIndex = objects.indexOf(obj);
          const firstImageIndex = objects.findIndex(o => o.type === 'image');
          // Remove user-added images (not the first one)
          return imageIndex !== firstImageIndex;
        }

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
}));
