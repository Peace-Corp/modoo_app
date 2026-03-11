'use client';

import { PrintMethodRecord } from '@/types/types';

interface PrintMethodsDisplayProps {
  printMethods: PrintMethodRecord[];
  className?: string;
}

export default function PrintMethodsDisplay({ printMethods, className = '' }: PrintMethodsDisplayProps) {
  if (printMethods.length === 0) return null;

  return (
    <div className={`px-3 py-2 ${className}`}>
      <p className="text-[11px] font-semibold text-gray-500 mb-1.5">인쇄 방식</p>
      <div className="flex flex-wrap gap-2">
        {printMethods.map((pm) => (
          <div key={pm.id} className="flex items-center gap-1.5">
            {pm.image_url && (
              <img
                src={pm.image_url}
                alt={pm.name}
                className="w-6 h-6 rounded object-cover"
              />
            )}
            <span className="text-[11px] text-gray-700">{pm.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
