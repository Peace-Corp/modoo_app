'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { X, ChevronLeft, Search, Loader2, Check, RotateCcw, Package, Plus } from 'lucide-react';
import { Product, ProductSide, LogoPlacement } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { CATEGORIES } from '@/lib/categories';
import SingleSideCanvas from '@/app/components/canvas/SingleSideCanvas';

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

type Step = 'select' | 'color' | 'placement' | 'review';

const getFirstSide = (product: Product): ProductSide | null => {
  const sides = (product.configuration || []) as ProductSide[];
  return sides.length > 0 ? sides[0] : null;
};

export default function AddProductModal({
  shareToken,
  mallName,
  logoUrl,
  onClose,
  onProductAdded,
}: AddProductModalProps) {
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

  // Step 3: Logo placement
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const logoRef = useRef<fabric.FabricImage | null>(null);
  const scaleRef = useRef<number>(1);
  const sideIdRef = useRef<string>('');
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoPlacement, setLogoPlacement] = useState<Record<string, LogoPlacement>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [canvasState, setCanvasState] = useState<Record<string, string>>({});

  // Step 4: Review & save
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Handle product selection → go to color step
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setError(null);
    fetchColors(product.id);
    setStep('color');
  };

  // Handle color confirmed → go to placement step
  const handleColorConfirm = () => {
    setIsCanvasReady(false);
    setHasLogo(false);
    setStep('placement');
  };

  // Canvas ready → place logo
  const placeLogoOnCanvas = useCallback(
    (canvas: fabric.Canvas, sideId: string, canvasScale: number) => {
      if (!selectedProduct || !logoUrl) return;
      const firstSide = getFirstSide(selectedProduct);
      if (!firstSide) return;

      // @ts-expect-error - Custom property
      const printAreaLeft = canvas.printAreaLeft || 0;
      // @ts-expect-error - Custom property
      const printAreaTop = canvas.printAreaTop || 0;

      // Remove existing logo
      const existing = canvas.getObjects().find(
        (obj) => (obj as fabric.FabricObject & { data?: { id?: string } }).data?.id === 'partner-mall-logo'
      );
      if (existing) canvas.remove(existing);

      fabric.FabricImage.fromURL(logoUrl, { crossOrigin: 'anonymous' })
        .then((logoImg) => {
          if (!canvasRef.current) return;

          const centerX = firstSide.printArea.width / 2;
          const centerY = firstSide.printArea.height / 2;
          const maxWidth = firstSide.printArea.width * 0.2;
          const maxHeight = firstSide.printArea.height * 0.2;
          const logoScale = Math.min(
            maxWidth / (logoImg.width || 100),
            maxHeight / (logoImg.height || 100)
          );

          logoImg.set({
            left: printAreaLeft + centerX * canvasScale,
            top: printAreaTop + centerY * canvasScale,
            scaleX: logoScale * canvasScale,
            scaleY: logoScale * canvasScale,
            originX: 'center',
            originY: 'center',
            data: { id: 'partner-mall-logo' },
          });

          logoRef.current = logoImg;
          canvasRef.current!.add(logoImg);
          canvasRef.current!.setActiveObject(logoImg);
          canvasRef.current!.renderAll();
          setHasLogo(true);
          setIsCanvasReady(true);
        })
        .catch((err) => {
          console.error('Error loading logo:', err);
          setIsCanvasReady(true);
        });
    },
    [selectedProduct, logoUrl]
  );

  const handleCanvasReady = useCallback(
    (canvas: fabric.Canvas, sideId: string, canvasScale: number) => {
      canvasRef.current = canvas;
      scaleRef.current = canvasScale;
      sideIdRef.current = sideId;
      placeLogoOnCanvas(canvas, sideId, canvasScale);
    },
    [placeLogoOnCanvas]
  );

  const resetLogoToCenter = () => {
    if (!canvasRef.current || !logoRef.current || !selectedProduct) return;
    const firstSide = getFirstSide(selectedProduct);
    if (!firstSide) return;

    const canvas = canvasRef.current;
    const logo = logoRef.current;
    const canvasScale = scaleRef.current;
    // @ts-expect-error - Custom property
    const printAreaLeft = canvas.printAreaLeft || 0;
    // @ts-expect-error - Custom property
    const printAreaTop = canvas.printAreaTop || 0;

    const centerX = firstSide.printArea.width / 2;
    const centerY = firstSide.printArea.height / 2;
    const maxWidth = firstSide.printArea.width * 0.2;
    const maxHeight = firstSide.printArea.height * 0.2;
    const logoScale = Math.min(
      maxWidth / (logo.width || 100),
      maxHeight / (logo.height || 100)
    );

    logo.set({
      left: printAreaLeft + centerX * canvasScale,
      top: printAreaTop + centerY * canvasScale,
      scaleX: logoScale * canvasScale,
      scaleY: logoScale * canvasScale,
      angle: 0,
      originX: 'center',
      originY: 'center',
    });
    canvas.renderAll();
  };

  // Serialize canvas state
  const serializeCanvasState = (): Record<string, string> => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedProduct) return {};
    const firstSide = getFirstSide(selectedProduct);
    if (!firstSide) return {};

    const userObjects = canvas.getObjects().filter((obj) => {
      if (obj.excludeFromExport) return false;
      // @ts-expect-error - Checking custom data property
      if (obj.data?.id === 'background-product-image') return false;
      return true;
    });

    const canvasData = {
      version: canvas.toJSON().version,
      objects: userObjects.map((obj) => {
        const json = obj.toObject(['data']);
        if (obj.type === 'image') {
          const imgObj = obj as fabric.FabricImage;
          json.src = imgObj.getSrc();
        }
        return json;
      }),
    };

    return { [firstSide.id]: JSON.stringify(canvasData) };
  };

  // Handle placement done → go to review
  const handlePlacementDone = () => {
    const canvas = canvasRef.current;
    const logo = logoRef.current;
    if (!canvas || !selectedProduct) return;
    const firstSide = getFirstSide(selectedProduct);
    if (!firstSide) return;

    let placement: Record<string, LogoPlacement> = {};

    if (logo) {
      const canvasScale = scaleRef.current;
      // @ts-expect-error - Custom property
      const printAreaLeft = canvas.printAreaLeft || 0;
      // @ts-expect-error - Custom property
      const printAreaTop = canvas.printAreaTop || 0;

      const logoLeft = logo.left || 0;
      const logoTop = logo.top || 0;
      const logoWidth = (logo.width || 100) * (logo.scaleX || 1);
      const logoHeight = (logo.height || 100) * (logo.scaleY || 1);

      placement = {
        [firstSide.id]: {
          x: Math.round((logoLeft - printAreaLeft) / canvasScale),
          y: Math.round((logoTop - printAreaTop) / canvasScale),
          width: Math.round(logoWidth / canvasScale),
          height: Math.round(logoHeight / canvasScale),
        },
      };
    }

    canvas.discardActiveObject();
    canvas.renderAll();

    let preview: string | null = null;
    try {
      preview = canvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 1 });
    } catch (err) {
      console.error('Error capturing preview:', err);
    }

    const state = serializeCanvasState();

    setLogoPlacement(placement);
    setPreviewUrl(preview);
    setCanvasState(state);

    // Set default display name
    const colorSuffix = selectedColor ? ` (${selectedColor.name})` : '';
    setDisplayName(`${mallName} ${selectedProduct.title}${colorSuffix}`);

    setStep('review');
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedProduct || !displayName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/partner-mall/${shareToken}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          logo_placements: logoPlacement,
          canvas_state: canvasState,
          preview_url: previewUrl,
          display_name: displayName.trim(),
          manufacturer_color_id: selectedColor?.id ?? null,
          color_hex: selectedColor?.hex ?? null,
          color_name: selectedColor?.name ?? null,
          color_code: selectedColor?.color_code ?? null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || '제품 추가에 실패했습니다.');
      }

      onProductAdded();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : '제품 추가에 실패했습니다.');
      setIsSaving(false);
    }
  };

  // Back navigation
  const handleBack = () => {
    setError(null);
    if (step === 'color') setStep('select');
    else if (step === 'placement') setStep('color');
    else if (step === 'review') setStep('placement');
  };

  const stepTitle: Record<Step, string> = {
    select: '제품 선택',
    color: '색상 선택',
    placement: '로고 배치',
    review: '제품 이름',
  };

  const firstSide = selectedProduct ? getFirstSide(selectedProduct) : null;

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

        {error && (
          <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

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

          {/* Step 3: Logo Placement */}
          {step === 'placement' && selectedProduct && firstSide && (
            <div className="p-3 space-y-3">
              <p className="text-xs text-gray-500">로고를 드래그하여 위치를 조정하세요.</p>

              <div className="relative bg-gray-100 rounded-lg overflow-hidden flex justify-center">
                {!isCanvasReady && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  </div>
                )}
                <div className="w-full overflow-auto flex justify-center">
                  <SingleSideCanvas
                    side={firstSide}
                    width={350}
                    height={430}
                    isEdit={true}
                    productColor={selectedColor?.hex}
                    onCanvasReady={handleCanvasReady}
                    showScaleBox={false}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={resetLogoToCenter}
                  disabled={!isCanvasReady || !hasLogo}
                  className="flex items-center gap-1 py-1.5 px-3 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  중앙으로
                </button>
                {isCanvasReady && !hasLogo && (
                  <button
                    onClick={() => {
                      if (canvasRef.current) {
                        placeLogoOnCanvas(canvasRef.current, sideIdRef.current, scaleRef.current);
                      }
                    }}
                    className="flex items-center gap-1 py-1.5 px-3 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    로고 추가
                  </button>
                )}
                <button
                  onClick={handlePlacementDone}
                  disabled={!isCanvasReady}
                  className="flex items-center gap-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  완료
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Save */}
          {step === 'review' && selectedProduct && (
            <div className="p-3 space-y-3">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="w-40 h-40 bg-gray-100 rounded-lg overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Product info summary */}
              <div className="text-center text-xs text-gray-500">
                {selectedProduct.title}
                {selectedColor && (
                  <span className="inline-flex items-center gap-1 ml-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-gray-200 inline-block"
                      style={{ backgroundColor: selectedColor.hex }}
                    />
                    {selectedColor.name}
                  </span>
                )}
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

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={isSaving || !displayName.trim()}
                className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '제품 추가'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
