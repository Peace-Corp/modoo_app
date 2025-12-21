'use client'

import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';

const EditButton = () => {
  const { isEditMode, setEditMode } = useCanvasStore();

  // Don't show button when already in edit mode
  if (isEditMode) return null;

  const handleEditClick = () => {
    setEditMode(true);
  };

  return (
    <button
      onClick={handleEditClick}
      className="fixed bottom-10 left-1/2 transform -translate-x-1/2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-xl z-50 text-lg"
    >
      Edit Current Design
    </button>
  );
};

export default EditButton;
