import React, { useState, useMemo } from 'react';
import * as fabric from 'fabric';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Plus, TextCursor, Layers } from 'lucide-react';
import { ProductSide } from '@/types/types';

interface ToolbarProps {
  sides?: ProductSide[];
}

const Toolbar: React.FC<ToolbarProps> = ({ sides = [] }) => {
  const { getActiveCanvas, activeSideId, setActiveSide, isEditMode, canvasMap } = useCanvasStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addText = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return; // for error handling

    const text = new fabric.IText('Text', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Arial',
      fill: '#333',
      fontSize: 30,
    })

    canvas.add(text);
    canvas.setActiveObject(text); // set the selected object to the text once created
    canvas.renderAll();  // render the new object
  };

  const handleSideSelect = (sideId: string) => {
    setActiveSide(sideId);
    setIsModalOpen(false);
  };

  // Generate canvas previews when modal is open
  const canvasPreviews = useMemo(() => {
    if (!isModalOpen) return {};

    const previews: Record<string, string> = {};
    sides.forEach((side) => {
      const canvas = canvasMap[side.id];
      if (canvas) {
        // Generate a data URL from the canvas
        previews[side.id] = canvas.toDataURL({
          format: 'png',
          quality: 0.8,
          multiplier: 0.3, // Scale down for thumbnail
        });
      }
    });
    return previews;
  }, [isModalOpen, sides, canvasMap]);

  // Only show toolbar in edit mode
  if (!isEditMode) return null;

  const currentSide = sides.find(side => side.id === activeSideId);

  return (
    <>
      {/* Modal for side selection */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-white/20 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 shadow-lg shadow-black"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">편집할 면 선택</h2>
            <div className="space-y-3">
              {sides.map((side) => (
                <button
                  key={side.id}
                  onClick={() => handleSideSelect(side.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4 ${
                    side.id === activeSideId
                      ? 'border-black bg-gray-100'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {/* Canvas Preview */}
                  <div className="flex-shrink-0 w-20 h-24 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                    {canvasPreviews[side.id] ? (
                      <img
                        src={canvasPreviews[side.id]}
                        alt={`${side.name} preview`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        미리보기
                      </div>
                    )}
                  </div>

                  {/* Side Info */}
                  <div className="flex-1">
                    <div className="font-semibold">{side.name}</div>
                    {side.id === activeSideId && (
                      <div className="text-sm text-gray-600 mt-1">현재 편집 중</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Center button for side selection */}
      {sides.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white shadow-xl rounded-full px-6 py-3 flex items-center gap-2 hover:bg-gray-50 transition border border-gray-200"
          >
            <Layers className="size-5" />
            <span className="font-medium">{currentSide?.name || '면 선택'}</span>
          </button>
        </div>
      )}

      {/* Right-side toolbar */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        {/* Inner buttons - expand upwards */}
        <div className={`flex flex-col gap-3 transition-all duration-300 overflow-hidden ${
          isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'
        }`}>
          <button
            onClick={addText}
            className="bg-white rounded-full p-3 flex items-center justify-center text-sm font-medium transition hover:bg-gray-50 border border-gray-200 whitespace-nowrap"
          >
            <TextCursor />
          </button>
          <button
            onClick={addText}
            className="bg-white rounded-full px-6 py-3 text-sm font-medium transition hover:bg-gray-50 border border-gray-200 whitespace-nowrap"
          >
            T
          </button>
          <button
            onClick={addText}
            className="bg-white rounded-full px-6 py-3 text-sm font-medium transition hover:bg-gray-50 border border-gray-200 whitespace-nowrap"
          >
            T
          </button>
        </div>

        {/* Plus button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`size-12 ${isExpanded ? "bg-black text-white" : "bg-white text-black"} shadow-xl rounded-full flex items-center justify-center hover:bg-gray-800 transition-all duration-300`}
          aria-label={isExpanded ? 'Close menu' : 'Open menu'}
        >
          <Plus className={`${isExpanded ? 'rotate-45' : ''} size-8 transition-all duration-300`}/>
        </button>
      </div>
    </>
  );
}

export default Toolbar;