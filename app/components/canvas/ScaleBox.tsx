'use client'
import React from 'react';

interface ScaleBoxProps {
  width: string;
  height: string;
  position: {
    x: number;
    y: number;
  };
  visible: boolean;
}

/**
 * ScaleBox component that displays real-world dimensions (in mm)
 * below selected canvas objects
 */
const ScaleBox: React.FC<ScaleBoxProps> = ({ width, height, position, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, 0)',
        // transition: 'left 0.05s ease-out, top 0.05s ease-out',
      }}
    >
      {/* Arrow pointing up to object */}
      <div
        className="absolute left-1/2 top-0 w-0 h-0"
        style={{
          transform: 'translate(-50%, -50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid rgba(0, 0, 0, 0.8)',
        }}
      />
      <div className="bg-black/80 text-white px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm mt-2">
        <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          <span>{width}</span>
          <span className="text-white/60">×</span>
          <span>{height}</span>
        </div>
      </div>
    </div>
  );
};

export default ScaleBox;