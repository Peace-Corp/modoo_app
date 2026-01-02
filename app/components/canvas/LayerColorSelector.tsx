'use client'
import React from 'react';
import { ProductLayer, ProductSide, ColorOption } from '@/types/types';
import { useCanvasStore } from '@/store/useCanvasStore';

interface LayerColorSelectorProps {
  side: ProductSide;
}

const LayerColorSelector: React.FC<LayerColorSelectorProps> = ({ side }) => {
  const { layerColors, setLayerColor } = useCanvasStore();

  // Determine if this is multi-layer or single-layer mode
  const isMultiLayer = side.layers && side.layers.length > 0;
  const isSingleLayerWithColors = !isMultiLayer && side.colorOptions && side.colorOptions.length > 0;

  // If neither multi-layer nor single-layer with colors, don't render anything
  if (!isMultiLayer && !isSingleLayerWithColors) {
    return null;
  }

  const handleColorChange = (layerId: string, color: string) => {
    setLayerColor(side.id, layerId, color);
  };

  // Render multi-layer color selector
  if (isMultiLayer) {
    // Sort layers by zIndex for consistent display
    const sortedLayers = [...side.layers!].sort((a, b) => a.zIndex - b.zIndex);

    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Colors</h3>
        <div className="space-y-3">
          {sortedLayers.map((layer) => {
            const currentColor = layerColors[side.id]?.[layer.id] || layer.colorOptions[0]?.hex || '#FFFFFF';

            return (
              <div key={layer.id} className="space-y-2">
                <label className="text-xs font-medium text-gray-600">
                  {layer.name}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {layer.colorOptions.map((colorOption) => (
                    <button
                      key={colorOption.colorCode}
                      onClick={() => handleColorChange(layer.id, colorOption.hex)}
                      className={`
                        w-10 h-10 rounded-full border-2 transition-all duration-200
                        ${currentColor === colorOption.hex
                          ? 'border-blue-500 scale-110 shadow-md'
                          : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                        }
                      `}
                      style={{ backgroundColor: colorOption.hex }}
                      aria-label={`Select ${colorOption.colorCode} (${colorOption.hex}) for ${layer.name}`}
                    >
                      {currentColor === colorOption.hex && (
                        <svg
                          className="w-full h-full p-2"
                          fill="none"
                          stroke={getContrastColor(colorOption.hex)}
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render single-layer color selector
  // Use sideId as the layerId for single-layer mode
  const currentColor = layerColors[side.id]?.[side.id] || side.colorOptions![0]?.hex || '#FFFFFF';

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Colors</h3>
      <div className="flex gap-2 flex-wrap">
        {side.colorOptions!.map((colorOption) => (
          <button
            key={colorOption.colorCode}
            onClick={() => handleColorChange(side.id, colorOption.hex)}
            className={`
              w-10 h-10 rounded-full border-2 transition-all duration-200
              ${currentColor === colorOption.hex
                ? 'border-blue-500 scale-110 shadow-md'
                : 'border-gray-300 hover:border-gray-400 hover:scale-105'
              }
            `}
            style={{ backgroundColor: colorOption.hex }}
            aria-label={`Select ${colorOption.colorCode} (${colorOption.hex})`}
          >
            {currentColor === colorOption.hex && (
              <svg
                className="w-full h-full p-2"
                fill="none"
                stroke={getContrastColor(colorOption.hex)}
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Helper function to determine if we should use white or black for the checkmark
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default LayerColorSelector;