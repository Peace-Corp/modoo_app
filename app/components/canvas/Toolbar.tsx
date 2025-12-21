import React, { useState } from 'react';
import * as fabric from 'fabric';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Plus, TextCursor } from 'lucide-react';



const Toolbar = () => {
  const { getActiveCanvas, activeSideId, isEditMode } = useCanvasStore();
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Only show toolbar in edit mode
  if (!isEditMode) return null;

  return (
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
  );
}

export default Toolbar;