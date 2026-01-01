'use client';

import React, { useState } from 'react';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { getOrderItemFiles, downloadFile, downloadAllOrderItemFiles } from '@/lib/order-files';

interface OrderFilesDownloadProps {
  orderItem: {
    id: string;
    product_title: string;
    text_svg_exports?: Record<string, string>;
    image_urls?: Record<string, Array<{ url: string; path?: string; uploadedAt?: string }>>;
  };
}

/**
 * Component to display and download all files for an order item
 * Shows uploaded images and generated SVG files
 *
 * Usage:
 * ```tsx
 * <OrderFilesDownload orderItem={orderItem} />
 * ```
 */
export default function OrderFilesDownload({ orderItem }: OrderFilesDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const files = getOrderItemFiles(orderItem);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      await downloadAllOrderItemFiles(orderItem);
      alert(`${files.allFiles.length}개 파일 다운로드 완료!`);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSingle = async (url: string, filename: string) => {
    try {
      await downloadFile(url, filename);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드 실패');
    }
  };

  if (files.allFiles.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">이 주문 항목에는 파일이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{orderItem.product_title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {files.images.length}개 이미지 · {files.svgs.length}개 SVG
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isDownloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          전체 다운로드
        </button>
      </div>

      <div className="space-y-4">
        {/* Images */}
        {files.images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileImage className="size-4" />
              업로드된 이미지 ({files.images.length})
            </h4>
            <div className="space-y-2">
              {files.images.map((image, index) => {
                const filename = `order-${orderItem.id}-${image.side}-image-${index + 1}.${
                  image.url.split('.').pop() || 'jpg'
                }`;

                return (
                  <div
                    key={`${image.side}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                        <img
                          src={image.url}
                          alt={`${image.side} image`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{image.side}</p>
                        <p className="text-xs text-gray-500">{filename}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadSingle(image.url, filename)}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="다운로드"
                    >
                      <Download className="size-4 text-gray-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SVGs */}
        {files.svgs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="size-4" />
              텍스트 SVG ({files.svgs.length})
            </h4>
            <div className="space-y-2">
              {files.svgs.map((svg) => {
                const filename = `order-${orderItem.id}-${svg.side}-text.svg`;

                return (
                  <div
                    key={svg.side}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded flex items-center justify-center">
                        <FileText className="size-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{svg.side}</p>
                        <p className="text-xs text-gray-500">{filename}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadSingle(svg.url, filename)}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="다운로드"
                    >
                      <Download className="size-4 text-gray-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}