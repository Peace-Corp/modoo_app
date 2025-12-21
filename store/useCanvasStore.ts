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
      // Only save user-added objects (exclude background images, guides, and snap lines)
      const userObjects = canvas.getObjects().filter(obj => {
        return obj.type !== 'image' && !obj.excludeFromExport;
      });

      // Create a minimal JSON with only user objects
      const canvasData = {
        version: canvas.toJSON().version,
        objects: userObjects.map(obj => obj.toJSON())
      };

      savedState[id] = JSON.stringify(canvasData);
    });

    return savedState;
  },

  // Restore all canvases from saved state
  restoreAllCanvasState: async (savedState: Record<string, string>) => {
    const { canvasMap } = get();

    const restorePromises = Object.entries(savedState).map(([id, json]) => {
      const canvas = canvasMap[id];
      if (!canvas) return Promise.resolve();

      return new Promise<void>((resolve) => {
        // First, remove only user-added objects (keep background image and guides)
        const objectsToRemove = canvas.getObjects().filter(obj => {
          return obj.type !== 'image' && !obj.excludeFromExport;
        });
        objectsToRemove.forEach(obj => canvas.remove(obj));

        // Then load the saved user objects
        const canvasData = JSON.parse(json);

        if (canvasData.objects && canvasData.objects.length > 0) {
          fabric.util.enlivenObjects(canvasData.objects).then((objects) => {
            objects.forEach((obj) => {
              if (obj && typeof obj === 'object' && 'type' in obj) {
                canvas.add(obj as fabric.FabricObject);
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

    return JSON.stringify(canvas.toJSON());
  },

  // Restore a specific canvas from JSON
  restoreCanvasState: async (id: string, json: string) => {
    const { canvasMap } = get();
    const canvas = canvasMap[id];

    if (!canvas) return;

    return new Promise<void>((resolve) => {
      canvas.loadFromJSON(json, () => {
        canvas.requestRenderAll();
        resolve();
      });
    });
  },
}));
