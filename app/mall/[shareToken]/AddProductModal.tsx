'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, Search, Loader2, Package } from 'lucide-react';
import { Product } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { CATEGORIES } from '@/lib/categories';
import { useRouter } from 'next/navigation';

interface AddProductModalProps {
  shareToken: string;
  mallName: string;
  logoUrl: string;
  onClose: () => void;
  onProductAdded: () => void;
}

interface SelectedColor {
  id: string;
  hex: string;
  name: string;
  color_code: string;
}

interface ProductColor {
  id: string;
  manufacturer_color_id: string;
  is_active: boolean;
  manufacturer_colors: {
    id: string;
    name: string;
    hex: string;
    color_code: string;
  };
}

type Step = 'select' | 'color' | 'review';

export default function AddProductModal({
  shareToken,
  mallName,
  logoUrl,
  onClose,
  onProductAdded,
}: AddProductModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');

  // Step 1: Product selection
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Step 2: Color selection
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor | null>(null);

  // Step 3: Review
  const [displayName, setDisplayName] = useState('');

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data as Product[]);
      }
      setIsLoadingProducts(false);
    };
    fetchProducts();
  }, []);

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Fetch colors when product is selected
  const fetchColors = useCallback(async (productId: string) => {
    setIsLoadingColors(true);
    setColors([]);
    setSelectedColor(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('product_colors')
      .select(`
        id, product_id, manufacturer_color_id, is_active,
        manufacturer_colors ( id, name, hex, color_code )
      `)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      const activeColors = (data as unknown as ProductColor[]).filter(
        (c) => c.is_active && c.manufacturer_colors
      );
      setColors(activeColors);

      // Auto-select first color
      if (activeColors.length > 0) {
        const mc = activeColors[0].manufacturer_colors;
        setSelectedColor({ id: mc.id, hex: mc.hex, name: mc.name, color_code: mc.color_code });
      }
    }
    setIsLoadingColors(false);
  }, []);

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    fetchColors(product.id);
    setStep('color');
  };

  // Handle color confirmed
  const handleColorConfirm = () => {
    const colorSuffix = selectedColor ? ` (${selectedColor.name})` : '';
    setDisplayName(`${mallName} ${selectedProduct!.title}${colorSuffix}`);
    setStep('review');
  };

  // Open editor with partner mall add data
  const handleOpenEditor = () => {
    if (!selectedProduct || !displayName.trim()) return;

    // Store data in sessionStorage for the editor to pick up
    sessionStorage.setItem('partnerMallAddData', JSON.stringify({
      shareToken,
      mallName,
      logoUrl,
      displayName: displayName.trim(),
      manufacturerColorId: selectedColor?.id ?? null,
      colorHex: selectedColor?.hex ?? null,
      colorName: selectedColor?.name ?? null,
      colorCode: selectedColor?.color_code ?? null,
    }));

    router.push(`/editor/${selectedProduct.id}?partnerMallAdd=true`);
  };

  // Back navigation
  const handleBack = () => {
    if (step === 'color') setStep('select');
    else if (step === 'review') setStep('color');
  };

  const stepTitle: Record<Step, string> = {
    select: '제품 선택',
    color: '색상 선택',
    review: '제품 설정',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-t-xl sm:rounded-xl sm:max-w-lg w-full h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-200">
          {step !== 'select' && (
            <button onClick={handleBack} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
          )}
          <h3 className="text-sm font-semibold text-gray-800 flex-1">{stepTitle[step]}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Product Selection */}
          {step === 'select' && (
            <div className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="제품명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Category filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      categoryFilter === cat.key
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product grid */}
              {isLoadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  {searchQuery ? '검색 결과가 없습니다.' : '제품이 없습니다.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="bg-gray-50 rounded-lg overflow-hidden text-left hover:ring-2 hover:ring-gray-900 transition-all"
                    >
                      <div className="aspect-square bg-gray-100 relative">
                        {product.thumbnail_image_link ? (
                          <img
                            src={product.thumbnail_image_link}
                            alt={product.title}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-800 line-clamp-1">{product.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{product.base_price.toLocaleString()}원</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Color Selection */}
          {step === 'color' && selectedProduct && (
            <div className="p-3 space-y-3">
              {/* Product info */}
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                {selectedProduct.thumbnail_image_link ? (
                  <img
                    src={selectedProduct.thumbnail_image_link}
                    alt={selectedProduct.title}
                    className="w-12 h-12 object-contain rounded bg-white"
                  />
                ) : (
                  <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-800">{selectedProduct.title}</p>
                  <p className="text-xs text-gray-500">{selectedProduct.base_price.toLocaleString()}원</p>
                </div>
              </div>

              {/* Colors */}
              {isLoadingColors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : colors.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">사용 가능한 색상이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colors.map((pc) => {
                    const mc = pc.manufacturer_colors;
                    const isSelected = selectedColor?.id === mc.id;
                    return (
                      <button
                        key={pc.id}
                        onClick={() =>
                          setSelectedColor(
                            isSelected
                              ? null
                              : { id: mc.id, hex: mc.hex, name: mc.name, color_code: mc.color_code }
                          )
                        }
                        className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-lg transition-colors ${
                          isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full border-2 ${
                            isSelected ? 'border-blue-500' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: mc.hex }}
                        />
                        <span className="text-[10px] text-gray-600 max-w-[48px] truncate">{mc.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Next button */}
              <button
                onClick={handleColorConfirm}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                다음
              </button>
            </div>
          )}

          {/* Step 3: Name & Open Editor */}
          {step === 'review' && selectedProduct && (
            <div className="p-3 space-y-3">
              {/* Product info summary */}
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                {selectedProduct.thumbnail_image_link ? (
                  <img
                    src={selectedProduct.thumbnail_image_link}
                    alt={selectedProduct.title}
                    className="w-12 h-12 object-contain rounded bg-white"
                  />
                ) : (
                  <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-800">{selectedProduct.title}</p>
                  {selectedColor && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="w-3 h-3 rounded-full border border-gray-200"
                        style={{ backgroundColor: selectedColor.hex }}
                      />
                      <span className="text-[10px] text-gray-500">{selectedColor.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Display name input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">제품 이름</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="제품 표시 이름"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Open editor button */}
              <button
                onClick={handleOpenEditor}
                disabled={!displayName.trim()}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                편집기에서 열기
              </button>
              <p className="text-[10px] text-gray-400 text-center">
                편집기에서 로고 배치, 텍스트, 이미지 등을 자유롭게 편집할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
