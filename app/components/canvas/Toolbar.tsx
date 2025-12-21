import React from 'react';
import * as fabric from 'fabric';
import { useCanvasStore } from '@/store/useCanvasStore';



const Toolbar = () => {
  const { getActiveCanvas, activeSideId } = useCanvasStore();

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
  
  return (
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-white shadow-xl rounded-full px-6 py-3 flex gap-4 border border-gray-200 z-50">
      <div className="flex items-center gap-2 border-r pr-4 mr-2">
        <span className="text-xs font-bold text-gray-400 uppercase">Editing:</span>
        <span className="font-bold text-blue-600 capitalize">{activeSideId}</span>
      </div>

      <button 
        onClick={addText}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
      >
        Add Text
      </button>
{/* 
      <button 
        onClick={addRectangle}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
      >
        Add Shape
      </button>

      <button 
        onClick={exportCurrentSide}
        className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition"
      >
        Save Side
      </button> */}
    </div>
  );
}

export default Toolbar;