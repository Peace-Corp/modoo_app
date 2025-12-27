'use client';

import { useState, useRef, useEffect } from 'react';
import { Product, ProductSide } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { Save, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PrintAreaEditorProps {
  product: Product;
  onSave: (updatedProduct: Product) => void;
  onCancel: () => void;
}

export default function PrintAreaEditor({ product, onSave, onCancel }: PrintAreaEditorProps) {
  const [currentSideIndex, setCurrentSideIndex] = useState(0);
  const [sides, setSides] = useState<ProductSide[]>(product.configuration || []);
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const currentSide = sides[currentSideIndex];

  useEffect(() => {
    if (currentSide) {
      drawCanvas();
    }
  }, [currentSide, imageLoaded, scale]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentSide.imageUrl;

    img.onload = () => {
      // Set canvas size based on container
      const container = containerRef.current;
      if (!container) return;

      const maxWidth = container.clientWidth - 32;
      const maxHeight = 600;

      const scaleFactor = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      setScale(scaleFactor);

      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;

      // Draw product image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw print area overlay
      const pa = currentSide.printArea;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        pa.x * scaleFactor,
        pa.y * scaleFactor,
        pa.width * scaleFactor,
        pa.height * scaleFactor
      );

      // Fill with semi-transparent overlay
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(
        pa.x * scaleFactor,
        pa.y * scaleFactor,
        pa.width * scaleFactor,
        pa.height * scaleFactor
      );

      // Draw resize handles
      ctx.setLineDash([]);
      const handleSize = 10;
      const handles = [
        { x: pa.x, y: pa.y, cursor: 'nw-resize' },
        { x: pa.x + pa.width, y: pa.y, cursor: 'ne-resize' },
        { x: pa.x, y: pa.y + pa.height, cursor: 'sw-resize' },
        { x: pa.x + pa.width, y: pa.y + pa.height, cursor: 'se-resize' },
      ];

      handles.forEach(handle => {
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(
          handle.x * scaleFactor - handleSize / 2,
          handle.y * scaleFactor - handleSize / 2,
          handleSize,
          handleSize
        );
      });

      setImageLoaded(true);
    };
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const pa = currentSide.printArea;
    const handleSize = 10 / scale;

    // Check if clicking on resize handles
    const handles = [
      { id: 'nw', x: pa.x, y: pa.y },
      { id: 'ne', x: pa.x + pa.width, y: pa.y },
      { id: 'sw', x: pa.x, y: pa.y + pa.height },
      { id: 'se', x: pa.x + pa.width, y: pa.y + pa.height },
    ];

    for (const handle of handles) {
      if (
        Math.abs(coords.x - handle.x) <= handleSize &&
        Math.abs(coords.y - handle.y) <= handleSize
      ) {
        setIsResizing(true);
        setResizeHandle(handle.id);
        setDragStart({ x: coords.x, y: coords.y });
        return;
      }
    }

    // Check if clicking inside print area for dragging
    if (
      coords.x >= pa.x &&
      coords.x <= pa.x + pa.width &&
      coords.y >= pa.y &&
      coords.y <= pa.y + pa.height
    ) {
      setIsDragging(true);
      setDragStart({ x: coords.x - pa.x, y: coords.y - pa.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const newSides = [...sides];
      const newX = Math.max(0, coords.x - dragStart.x);
      const newY = Math.max(0, coords.y - dragStart.y);

      newSides[currentSideIndex] = {
        ...currentSide,
        printArea: {
          ...currentSide.printArea,
          x: Math.round(newX),
          y: Math.round(newY),
        },
      };
      setSides(newSides);
    } else if (isResizing && resizeHandle) {
      const newSides = [...sides];
      const pa = { ...currentSide.printArea };

      switch (resizeHandle) {
        case 'nw':
          pa.width = pa.width + (pa.x - coords.x);
          pa.height = pa.height + (pa.y - coords.y);
          pa.x = coords.x;
          pa.y = coords.y;
          break;
        case 'ne':
          pa.width = coords.x - pa.x;
          pa.height = pa.height + (pa.y - coords.y);
          pa.y = coords.y;
          break;
        case 'sw':
          pa.width = pa.width + (pa.x - coords.x);
          pa.height = coords.y - pa.y;
          pa.x = coords.x;
          break;
        case 'se':
          pa.width = coords.x - pa.x;
          pa.height = coords.y - pa.y;
          break;
      }

      // Ensure minimum size
      pa.width = Math.max(50, Math.round(pa.width));
      pa.height = Math.max(50, Math.round(pa.height));
      pa.x = Math.max(0, Math.round(pa.x));
      pa.y = Math.max(0, Math.round(pa.y));

      newSides[currentSideIndex] = {
        ...currentSide,
        printArea: pa,
      };
      setSides(newSides);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('products')
        .update({
          configuration: sides,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      onSave(data);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('제품 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updatePrintAreaField = (field: string, value: number) => {
    const newSides = [...sides];
    newSides[currentSideIndex] = {
      ...currentSide,
      printArea: {
        ...currentSide.printArea,
        [field]: Math.max(0, Math.round(value)),
      },
    };
    setSides(newSides);
  };

  const updateRealLifeDimensions = (field: string, value: number) => {
    const newSides = [...sides];
    newSides[currentSideIndex] = {
      ...currentSide,
      realLifeDimensions: {
        ...(currentSide.realLifeDimensions || {
          printAreaWidthMm: 0,
          printAreaHeightMm: 0,
          productWidthMm: 0,
        }),
        [field]: Math.max(0, Math.round(value)),
      },
    };
    setSides(newSides);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">인쇄 영역 편집</h2>
          <p className="text-gray-500 mt-1">{product.title}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Side Navigation */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentSideIndex(Math.max(0, currentSideIndex - 1))}
                disabled={currentSideIndex === 0}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="font-semibold text-gray-900">{currentSide?.name}</h3>
                <p className="text-sm text-gray-500">
                  {currentSideIndex + 1} / {sides.length}
                </p>
              </div>

              <button
                onClick={() => setCurrentSideIndex(Math.min(sides.length - 1, currentSideIndex + 1))}
                disabled={currentSideIndex === sides.length - 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="bg-white rounded-lg p-4 shadow-sm">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="mx-auto border border-gray-200 rounded cursor-move"
              style={{ maxWidth: '100%' }}
            />
            <p className="text-sm text-gray-500 mt-4 text-center">
              파란 영역을 드래그하여 위치를 조정하고, 모서리를 드래그하여 크기를 조절하세요.
            </p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Print Area Coordinates */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">인쇄 영역 (픽셀)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X 위치</label>
                <input
                  type="number"
                  value={currentSide?.printArea.x || 0}
                  onChange={(e) => updatePrintAreaField('x', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y 위치</label>
                <input
                  type="number"
                  value={currentSide?.printArea.y || 0}
                  onChange={(e) => updatePrintAreaField('y', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">너비</label>
                <input
                  type="number"
                  value={currentSide?.printArea.width || 0}
                  onChange={(e) => updatePrintAreaField('width', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">높이</label>
                <input
                  type="number"
                  value={currentSide?.printArea.height || 0}
                  onChange={(e) => updatePrintAreaField('height', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Real Life Dimensions */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">실제 치수 (mm)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">인쇄 영역 너비</label>
                <input
                  type="number"
                  value={currentSide?.realLifeDimensions?.printAreaWidthMm || 0}
                  onChange={(e) => updateRealLifeDimensions('printAreaWidthMm', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">인쇄 영역 높이</label>
                <input
                  type="number"
                  value={currentSide?.realLifeDimensions?.printAreaHeightMm || 0}
                  onChange={(e) => updateRealLifeDimensions('printAreaHeightMm', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 너비</label>
                <input
                  type="number"
                  value={currentSide?.realLifeDimensions?.productWidthMm || 0}
                  onChange={(e) => updateRealLifeDimensions('productWidthMm', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 사용 방법</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 파란 영역을 드래그하여 이동</li>
              <li>• 모서리 핸들을 드래그하여 크기 조절</li>
              <li>• 숫자 입력으로 정밀한 조정</li>
              <li>• 실제 치수는 mm 단위로 입력</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
