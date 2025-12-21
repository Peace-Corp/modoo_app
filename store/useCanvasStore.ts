import { create } from 'zustand';
import * as fabric from 'fabric';


interface CanvasState {
  // Aplication State
  activeSideId: string;
  setActiveSide: (id: string) => void;

  canvasMap: Record<string, fabric.Canvas>;
  registerCanvas: (id: string, cavas: fabric.Canvas) => void;
  unregisterCanvas: (id: string) => void;

  getActiveCanvas: () => fabric.Canvas | null;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  activeSideId: 'front',
  canvasMap: {},
  setActiveSide: (id) => set({ activeSideId: id}),

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
}));
