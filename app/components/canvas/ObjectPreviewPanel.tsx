'use client'

import React, { useMemo, useState } from 'react';
import * as fabric from 'fabric';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ProductSide, PrintMethod } from '@/types/types';
import { Image as ImageIcon, Type, Square, ChevronDown, HelpCircle, X } from 'lucide-react';

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
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

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
      <div className="flex items-center mb-3">
        <h3 className="text-sm font-bold text-gray-800">인쇄방법 설정</h3>
        <button
          onClick={() => setIsPricingModalOpen(true)}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1"
          title="인쇄방법 가격 안내"
        >
          <HelpCircle className="size-4" />
          <h3 className='text-gray-500 text-xs'>방법별 특징</h3>
        </button>
      </div>

      {/* Pricing Info Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="text-lg font-bold text-gray-800">인쇄방법별 가격 안내</h4>
              <button
                onClick={() => setIsPricingModalOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Transfer Methods Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">전사 (소량/다색상)</p>

                {/* DTF */}
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 mb-2">
                  <h5 className="font-bold text-blue-800 mb-1 text-sm">DTF (Direct to Film)</h5>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    <li>• 디자인 면적 기준 가격 책정</li>
                    <li>• 풀컬러 인쇄 가능, 색상 수 무관</li>
                    <li>• 소량 주문에 적합 (1~99개)</li>
                  </ul>
                </div>

                {/* DTG */}
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <h5 className="font-bold text-blue-800 mb-1 text-sm">DTG (Direct to Garment)</h5>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    <li>• 원단에 직접 인쇄, 부드러운 촉감</li>
                    <li>• 면 소재에 최적화</li>
                    <li>• 복잡한 그래픽/사진에 적합</li>
                  </ul>
                </div>
              </div>

              {/* Bulk Methods Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">대량 (100개+)</p>

                {/* Screen Printing */}
                <div className="border border-green-200 rounded-lg p-3 bg-green-50 mb-2">
                  <h5 className="font-bold text-green-800 mb-1 text-sm">나염 (Screen Printing)</h5>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    <li>• 색상 수 기준 가격 책정</li>
                    <li>• 대량 주문 시 단가 대폭 할인</li>
                    <li>• 단순한 로고/텍스트에 최적</li>
                  </ul>
                </div>

                {/* Embroidery */}
                <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 mb-2">
                  <h5 className="font-bold text-purple-800 mb-1 text-sm">자수 (Embroidery)</h5>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    <li>• 스티치 수 기준 가격 책정</li>
                    <li>• 고급스러운 질감, 내구성 우수</li>
                    <li>• 로고, 텍스트, 단순 디자인에 적합</li>
                  </ul>
                </div>

                {/* Applique */}
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                  <h5 className="font-bold text-amber-800 mb-1 text-sm">아플리케 (Applique)</h5>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    <li>• 원단 패치 + 자수 테두리</li>
                    <li>• 입체감 있는 고급 마감</li>
                    <li>• 큰 로고, 숫자, 레터링에 적합</li>
                  </ul>
                </div>
              </div>

              {/* Tips */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <h5 className="font-bold text-gray-800 mb-1 text-sm">팁</h5>
                <p className="text-xs text-gray-600">
                  인쇄 방식을 선택하지 않으면 색상 수와 크기에 따라 최적의 방식이 자동 적용됩니다.
                </p>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setIsPricingModalOpen(false)}
                className="w-full py-2 px-4 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

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
          총 <span className="font-semibold text-gray-800">{allObjects.length}개</span>의 인쇄 요소
        </p>
      </div>
    </div>
  );
};

export default ObjectPreviewPanel;
