'use client';

import React from 'react';
import { TemplatePickerItem } from '@/types/types';
import { ImageIcon } from 'lucide-react';

interface TemplateCardProps {
  template: TemplatePickerItem;
  isSelected: boolean;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`w-full aspect-square rounded-lg border-2 overflow-hidden transition-all ${
        isSelected
          ? 'border-black ring-2 ring-black ring-offset-2'
          : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      <div className="relative w-full h-full bg-gray-100">
        {template.preview_url ? (
          <img
            src={template.preview_url}
            alt={template.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="size-8 text-gray-300" />
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-white text-xs font-medium truncate">{template.title}</p>
        </div>

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-black rounded-full p-1">
            <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
};

export default TemplateCard;
