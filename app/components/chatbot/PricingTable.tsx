'use client';

import { PricingData } from '@/lib/chatbot/types';

interface PricingTableProps {
  data: PricingData;
}

export default function PricingTable({ data }: PricingTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm">
          {data.methodKorean}
        </h4>
      </div>
      <div className="divide-y divide-gray-100">
        {data.sizes.map((item, index) => (
          <div key={index} className="px-3 py-2 flex justify-between items-start">
            <div className="text-sm text-gray-600">{item.size}</div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{item.price}</div>
              {item.note && (
                <div className="text-xs text-gray-500">{item.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
