'use client'

import React, { useMemo, useState } from 'react';
import * as fabric from 'fabric';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ProductSide, PrintMethod } from '@/types/types';
import { Image as ImageIcon, Type, Square, ChevronDown } from 'lucide-react';

interface ObjectPreviewPanelProps {
  sides: ProductSide[];
}

interface CanvasObjectInfo {
  objectId: string;
  type: string;
  sideId: string;
  sideName: string;
  widthMm: number;
  heightMm: number;
  printMethod?: PrintMethod;
  preview: string; // Data URL for preview
  object: fabric.FabricObject;
}

const ObjectPreviewPanel: React.FC<ObjectPreviewPanelProps> = ({ sides }) => {
  const { canvasMap, canvasVersion, setObjectPrintMethod, getObjectPrintMethod } = useCanvasStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (objectId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  };

  // Extract all user objects from all canvases
  const allObjects = useMemo(() => {
    const objects: CanvasObjectInfo[] = [];

    sides.forEach((side) => {
      const canvas = canvasMap[side.id];
      if (!canvas) {
        return;
      }

      // Get real-world product width from side data
      const realWorldProductWidth = side.realLifeDimensions?.productWidthMm || 500;

      // Get scaled image width from canvas custom properties
      // @ts-expect-error - Custom property
      const scaledImageWidth = canvas.scaledImageWidth;
      // @ts-expect-error - Custom property
      const scaledPrintLeft = canvas.printAreaLeft || 0;
      // @ts-expect-error - Custom property
      const scaledPrintTop = canvas.printAreaTop || 0;

      // Calculate pixel-to-mm ratio
      const pixelToMmRatio = scaledImageWidth ? realWorldProductWidth / scaledImageWidth : 0.25;

      // Filter user objects
      const userObjects = canvas.getObjects().filter(obj => {
        if (obj.excludeFromExport) return false;
        // @ts-expect-error - Checking custom data property
        if (obj.data?.id === 'background-product-image') return false;
        return true;
      });

      userObjects.forEach((obj) => {
        // @ts-expect-error - Accessing custom data property
        const objectId = obj.data?.objectId;
        if (!objectId) {
          return;
        }

        // Get object bounding box
        const boundingRect = obj.getBoundingRect();

        // Calculate size in mm
        const widthMm = boundingRect.width * pixelToMmRatio;
        const heightMm = boundingRect.height * pixelToMmRatio;

        // Get print method
        const printMethod = getObjectPrintMethod(obj);

        // Generate preview by rendering canvas area around the object
        let preview = '';
        try {
          // Get object bounds
          const bounds = obj.getBoundingRect();

          // Add some padding around the object
          const padding = 20;
          const left = Math.max(0, bounds.left - padding);
          const top = Math.max(0, bounds.top - padding);
          const width = bounds.width + (padding * 2);
          const height = bounds.height + (padding * 2);

          // Render the canvas area containing this object
          preview = canvas.toDataURL({
            format: 'png',
            quality: 0.8,
            multiplier: 1,
            left: left,
            top: top,
            width: width,
            height: height,
          });
        } catch {
          // Preview generation failed
        }

        objects.push({
          objectId,
          type: obj.type || 'unknown',
          sideId: side.id,
          sideName: side.name,
          widthMm,
          heightMm,
          printMethod: printMethod || undefined,
          preview,
          object: obj,
        });
      });
    });

    return objects;
  }, [canvasMap, sides, canvasVersion, getObjectPrintMethod]);

  const handlePrintMethodChange = (objectId: string, method: PrintMethod) => {
    setObjectPrintMethod(objectId, method);
  };

  const getObjectIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="size-4" />;
    if (type === 'i-text' || type === 'text') return <Type className="size-4" />;
    return <Square className="size-4" />;
  };

  const getObjectTypeName = (type: string) => {
    if (type === 'image') return '이미지';
    if (type === 'i-text' || type === 'text') return '텍스트';
    if (type === 'rect') return '사각형';
    if (type === 'circle') return '원형';
    return '오브젝트';
  };

  if (allObjects.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 mb-4">
      <h3 className="text-sm font-bold mb-3 text-gray-800">디자인 요소</h3>

      <div className="space-y-3">
        {allObjects.map((objInfo) => {
          const isExpanded = expandedItems.has(objInfo.objectId);
          return (
            <div
              key={objInfo.objectId}
              className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
            >
              {/* Accordion Header - Clickable */}
              <button
                onClick={() => toggleExpanded(objInfo.objectId)}
                className="w-full p-3 flex items-start gap-3 text-left hover:bg-gray-100 transition-colors"
              >
                {/* Preview Thumbnail */}
                <div className="w-16 h-16 bg-white border border-gray-200 rounded flex items-center justify-center shrink-0 overflow-hidden">
                  {objInfo.preview ? (
                    <img
                      src={objInfo.preview}
                      alt={getObjectTypeName(objInfo.type)}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-gray-400">
                      {getObjectIcon(objInfo.type)}
                    </div>
                  )}
                </div>

                {/* Object Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getObjectIcon(objInfo.type)}
                    <span className="text-sm font-semibold text-gray-700">
                      {getObjectTypeName(objInfo.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({objInfo.sideName})
                    </span>
                  </div>

                  {/* Size Information */}
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">너비:</span>
                      <span>{objInfo.widthMm.toFixed(1)}mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">높이:</span>
                      <span>{objInfo.heightMm.toFixed(1)}mm</span>
                    </div>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronDown
                  className={`size-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Print Method Selector - Collapsible Content */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-200">
                  <div className="pt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">인쇄 방식</p>

                    {/* Transfer Methods (DTF, DTG) */}
                    <div className="mb-2">
                      <p className="text-[10px] text-gray-500 mb-1">전사 (소량/다색상)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePrintMethodChange(objInfo.objectId, 'dtf')}
                          className={`px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all ${
                            objInfo.printMethod === 'dtf'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          DTF
                        </button>
                        <button
                          onClick={() => handlePrintMethodChange(objInfo.objectId, 'dtg')}
                          className={`px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all ${
                            objInfo.printMethod === 'dtg'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          DTG
                        </button>
                      </div>
                    </div>

                    {/* Bulk Methods (Screen Printing, Embroidery, Applique) */}
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">대량 (100개+)</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handlePrintMethodChange(objInfo.objectId, 'screen_printing')}
                          className={`px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all ${
                            objInfo.printMethod === 'screen_printing'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          나염
                        </button>
                        <button
                          onClick={() => handlePrintMethodChange(objInfo.objectId, 'embroidery')}
                          className={`px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all ${
                            objInfo.printMethod === 'embroidery'
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          자수
                        </button>
                        <button
                          onClick={() => handlePrintMethodChange(objInfo.objectId, 'applique')}
                          className={`px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all ${
                            objInfo.printMethod === 'applique'
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          아플리케
                        </button>
                      </div>
                    </div>

                    {/* Auto-selection note */}
                    {!objInfo.printMethod && (
                      <p className="text-[10px] text-gray-500 mt-2 italic">
                        자동 선택: 색상 수와 크기에 따라 최적 방식 적용
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          총 <span className="font-semibold text-gray-800">{allObjects.length}개</span>의 디자인 요소
        </p>
      </div>
    </div>
  );
};

export default ObjectPreviewPanel;
