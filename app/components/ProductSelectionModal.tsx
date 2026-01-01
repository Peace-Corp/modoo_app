'use client'

import { useState, useEffect } from 'react';
import { Product } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { Search, X } from 'lucide-react';
import Image from 'next/image';

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedProducts: Product[]) => void;
  initialSelectedProducts?: Product[];
}

export default function ProductSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelectedProducts = []
}: ProductSelectionModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(initialSelectedProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSelectedProducts(initialSelectedProducts);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data as Product[]);
      setFilteredProducts(data as Product[]);
    }
    setIsLoading(false);
  };

  const toggleProductSelection = (product: Product) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedProducts);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const getProductImageUrl = (product: Product) => {
    if (product.configuration && product.configuration.length > 0) {
      return product.configuration[0].imageUrl ?? '/placeholder-product.png';
    }
    return '/placeholder-product.png';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg w-full max-w-2xl max-h-[80vh] mx-4 shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">제품 선택</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제품 이름으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
            />
          </div>

          {/* Selected Products Count */}
          {selectedProducts.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              {selectedProducts.length}개 제품 선택됨
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '제품이 없습니다.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProductSelection(product)}
                    className={`
                      relative cursor-pointer rounded-lg border-2 p-3 transition
                      ${isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${isSelected
                          ? 'bg-black border-black'
                          : 'bg-white border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                      <Image
                        src={getProductImageUrl(product)}
                        alt={product.title}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* Product Info */}
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {product.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ₩{product.base_price.toLocaleString()}
                      </p>
                      {product.category && (
                        <p className="text-xs text-gray-500 mt-1">
                          {product.category}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              선택 완료 ({selectedProducts.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
