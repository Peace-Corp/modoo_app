'use client'
import React, { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { PrintMethod } from '@/types/types';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Printer, Info } from 'lucide-react';

interface PrintMethodSelectorProps {
  selectedObject: fabric.FabricObject;
}

// Print method display information
const PRINT_METHODS = [
  {
    id: 'dtf' as PrintMethod,
    name: 'DTF 전사',
    description: '모든 색상 지원, 빠른 생산',
    shortDesc: '전사 (권장)',
    color: 'blue'
  },
  {
    id: 'dtg' as PrintMethod,
    name: 'DTG 전사',
    description: '고품질 전사, 세밀한 디테일',
    shortDesc: '고급 전사',
    color: 'indigo'
  },
  {
    id: 'screen_printing' as PrintMethod,
    name: '나염',
    description: '대량 주문 시 유리 (100개 이상)',
    shortDesc: '나염 (대량)',
    color: 'green'
  },
  {
    id: 'embroidery' as PrintMethod,
    name: '자수',
    description: '고급스러운 느낌, 대량 주문 시 유리',
    shortDesc: '자수 (대량)',
    color: 'purple'
  },
  {
    id: 'applique' as PrintMethod,
    name: '아플리케',
    description: '독특한 질감, 대량 주문 시 유리',
    shortDesc: '아플리케 (대량)',
    color: 'amber'
  }
];

const PrintMethodSelector: React.FC<PrintMethodSelectorProps> = ({ selectedObject }) => {
  const { setObjectPrintMethod, getObjectPrintMethod, incrementCanvasVersion } = useCanvasStore();
  const [currentMethod, setCurrentMethod] = useState<PrintMethod | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Get object ID
  // @ts-expect-error - Checking custom data property
  const objectId = selectedObject.data?.objectId;

  useEffect(() => {
    // Get the current print method from the object
    const method = getObjectPrintMethod(selectedObject);
    setCurrentMethod(method);
  }, [selectedObject, getObjectPrintMethod]);

  const handleMethodChange = (method: PrintMethod) => {
    if (!objectId) {
      console.warn('Object does not have an objectId');
      return;
    }

    setObjectPrintMethod(objectId, method);
    setCurrentMethod(method);
    incrementCanvasVersion(); // Trigger pricing recalculation
  };

  if (!objectId) {
    return null; // Don't render if object doesn't have an ID
  }

  const selectedMethodInfo = PRINT_METHODS.find(m => m.id === currentMethod);

  return (
    <div className="w-full border-t border-gray-200 bg-gray-50/50 p-4">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="size-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">인쇄 방식 선택</span>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 hover:bg-gray-200 rounded transition"
            title="인쇄 방식 정보"
          >
            <Info className="size-4 text-gray-500" />
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
            <p className="font-medium mb-2">인쇄 방식 안내:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>전사 (DTF/DTG):</strong> 색상 제한 없음, 소량 주문에 적합</li>
              <li><strong>나염/자수/아플리케:</strong> 색상 수에 따라 가격 변동, 대량 주문(100개 이상)에 유리</li>
              <li><strong>4가지 이상 색상:</strong> 전사 방식 권장</li>
            </ul>
          </div>
        )}

        {/* Method Selection Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {PRINT_METHODS.map((method) => {
            const isSelected = currentMethod === method.id;
            const isAuto = !currentMethod;

            return (
              <button
                key={method.id}
                onClick={() => handleMethodChange(method.id)}
                className={`
                  relative p-3 rounded-lg border-2 text-left transition-all
                  ${isSelected
                    ? `border-${method.color}-500 bg-${method.color}-50`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div className="flex flex-col gap-1">
                  <span className={`text-sm font-semibold ${
                    isSelected ? `text-${method.color}-700` : 'text-gray-700'
                  }`}>
                    {method.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {method.description}
                  </span>
                </div>
                {isSelected && (
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${method.color}-500`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Auto-selection Note */}
        {!currentMethod && (
          <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
            💡 자동 선택: 색상 수와 크기에 따라 최적의 인쇄 방식이 자동으로 선택됩니다.
          </div>
        )}

        {/* Current Selection Info */}
        {currentMethod && selectedMethodInfo && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
            <span className="font-medium">선택된 방식:</span> {selectedMethodInfo.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintMethodSelector;
