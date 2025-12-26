'use client'

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getUserDesigns, SavedDesign } from '@/lib/designService';

interface SavedDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDesign: (design: SavedDesign) => void;
}

export default function SavedDesignsModal({
  isOpen,
  onClose,
  onSelectDesign,
}: SavedDesignsModalProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDesigns();
    }
  }, [isOpen]);

  const loadDesigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userDesigns = await getUserDesigns();
      setDesigns(userDesigns);
      if (userDesigns.length === 0) {
        setError('저장된 디자인이 없습니다.');
      }
    } catch (err) {
      console.error('Failed to load designs:', err);
      setError('디자인을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesignClick = (design: SavedDesign) => {
    onSelectDesign(design);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">저장된 디자인</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
              <p className="text-gray-500">디자인 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500">{error}</p>
              {designs.length === 0 && (
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  닫기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {designs.map((design) => (
                <button
                  key={design.id}
                  onClick={() => handleDesignClick(design)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-black hover:shadow-md transition text-left"
                >
                  <div className="flex flex-col gap-2">
                    {/* Design Title */}
                    <h3 className="font-medium text-gray-900 truncate">
                      {design.title || '제목 없음'}
                    </h3>

                    {/* Product Color */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">색상:</span>
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{
                          backgroundColor:
                            (design.color_selections as any)?.productColor || '#FFFFFF',
                        }}
                      />
                    </div>

                    {/* Canvas Info */}
                    <div className="text-xs text-gray-500">
                      {Object.keys(design.canvas_state || {}).length}개 면 디자인
                    </div>

                    {/* Date */}
                    <p className="text-xs text-gray-400">
                      {new Date(design.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={loadDesigns}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}