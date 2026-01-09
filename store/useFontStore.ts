import { create } from 'zustand';
import { FontMetadata, loadCustomFont } from '@/lib/fontUtils';

interface FontState {
  // Custom fonts loaded for the current design
  customFonts: FontMetadata[];

  // Add a custom font to the store
  addFont: (font: FontMetadata) => void;

  // Remove a custom font from the store
  removeFont: (fontFamily: string) => void;

  // Load all fonts into the browser
  loadAllFonts: () => Promise<void>;

  // Set all custom fonts (e.g., when loading a design)
  setCustomFonts: (fonts: FontMetadata[]) => void;

  // Clear all custom fonts
  clearFonts: () => void;

  // Check if a font is already loaded
  isFontLoaded: (fontFamily: string) => boolean;
}

export const useFontStore = create<FontState>((set, get) => ({
  customFonts: [],

  addFont: (font) => {
    set((state) => {
      // Check if font with same family already exists
      const exists = state.customFonts.some(f => f.fontFamily === font.fontFamily);
      if (exists) {
        console.warn(`Font "${font.fontFamily}" already exists in store`);
        return state;
      }

      return {
        customFonts: [...state.customFonts, font]
      };
    });
  },

  removeFont: (fontFamily) => {
    set((state) => ({
      customFonts: state.customFonts.filter(f => f.fontFamily !== fontFamily)
    }));
  },

  loadAllFonts: async () => {
    const { customFonts } = get();

    const loadPromises = customFonts.map(async (font) => {
      try {
        await loadCustomFont(font);
      } catch (error) {
        console.error(`Failed to load font "${font.fontFamily}":`, error);
      }
    });

    await Promise.all(loadPromises);
  },

  setCustomFonts: (fonts) => {
    set({ customFonts: fonts });
  },

  clearFonts: () => {
    set({ customFonts: [] });
  },

  isFontLoaded: (fontFamily) => {
    const { customFonts } = get();
    return customFonts.some(f => f.fontFamily === fontFamily);
  },
}));
