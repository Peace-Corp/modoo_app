'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import {
  X, ArrowLeft, ArrowRight, CheckCircle2, Share2,
  Truck, MapPin, Search, Calendar, Tag,
  Sparkles, Gift, ChevronLeft, ChevronRight, Check, Copy, ShoppingBag,
  TextCursor, ImagePlus, Trash2, Palette, UserCircle, Mail, Phone, Pencil,
  Undo2, Redo2,
} from 'lucide-react';
import {
  Product, ProductSide, CoBuyCustomField, CoBuyDeliverySettings, CoBuyAddressInfo,
  CoBuyRequestSchedulePreferences, CoBuyRequestQuantityExpectations,
} from '@/types/types';
import { createCoBuyRequest } from '@/lib/cobuyRequestService';
import CustomFieldBuilder from '@/app/components/cobuy/CustomFieldBuilder';
import LayerColorSelector from '@/app/components/canvas/LayerColorSelector';
import { createClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useCanvasStore } from '@/store/useCanvasStore';

const SingleSideCanvas = dynamic(() => import('@/app/components/canvas/SingleSideCanvas'), {
  ssr: false,
  loading: () => <div className="w-full aspect-[4/5] bg-[#EBEBEB] animate-pulse rounded-xl" />,
});


type Step =
  | 'guest-info'
  | 'product-select'
  | 'color-select'
  | 'freeform-design'
  | 'title-description'
  | 'schedule-address'
  | 'delivery-participants'
  | 'review'
  | 'success';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'guest-info', label: '기본 정보', icon: <UserCircle className="w-4 h-4" /> },
  { id: 'product-select', label: '제품 선택', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'color-select', label: '색상 선택', icon: <Palette className="w-4 h-4" /> },
  { id: 'freeform-design', label: '디자인', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'title-description', label: '제목 및 설명', icon: <Tag className="w-4 h-4" /> },
  { id: 'schedule-address', label: '일정 및 장소', icon: <Calendar className="w-4 h-4" /> },
  { id: 'delivery-participants', label: '배송 및 참여자', icon: <Gift className="w-4 h-4" /> },
  { id: 'review', label: '최종 확인', icon: <CheckCircle2 className="w-4 h-4" /> },
];

export default function CreateCoBuyRequestPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { canvasMap, layerColors, setEditMode, activeSideId, setActiveSide, getActiveCanvas, setProductColor } = useCanvasStore();

  const [currentStep, setCurrentStep] = useState<Step>(isAuthenticated ? 'freeform-design' : 'guest-info');

  const [isCreating, setIsCreating] = useState(false);
  const [createdShareToken, setCreatedShareToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Guest info (for non-authenticated users)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Product selection (fixed to a single product)
  const FIXED_PRODUCT_ID = '0d8f53fa-bac2-4f0a-8eb4-870a70e072eb';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Product colors (fetched from product_colors table)
  const [productColors, setProductColors] = useState<{ id: string; hex: string; name: string; colorCode: string }[]>([]);
  const [selectedColorHex, setSelectedColorHex] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [receiveByDate, setReceiveByDate] = useState('');
  const minQuantity: number | '' = '';
  const maxQuantity: number | '' = '';
  const [customFields, setCustomFields] = useState<CoBuyCustomField[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<CoBuyDeliverySettings>({
    enabled: false,
    deliveryFee: 4000,
    pickupLocation: '',
    deliveryAddress: undefined,
    pickupAddress: undefined,
  });
  const isPublic = false;
  const [isPostcodeScriptLoaded, setIsPostcodeScriptLoaded] = useState(false);

  // Saved canvas data (captured when leaving freeform step, since canvases unmount after)
  const [savedCanvasState, setSavedCanvasState] = useState<Record<string, string>>({});
  const [savedPreviewUrl, setSavedPreviewUrl] = useState<string | null>(null);
  const [savedColorSelections, setSavedColorSelections] = useState<Record<string, Record<string, string>>>({});

  // Color preview side navigation
  const [colorPreviewIndex, setColorPreviewIndex] = useState(0);

  // Freeform tutorial modal
  const [showFreeformTutorial, setShowFreeformTutorial] = useState(true);

  // Drawing mode
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');

  // Undo/redo history
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoing, setIsUndoRedoing] = useState(false);

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Check if selected product has any color options (from product_colors table or layer configuration)
  const hasLayerColorOptions = useMemo(() => {
    const sides = selectedProduct?.configuration ?? [];
    return sides.some((side: any) =>
      (side.layers && side.layers.some((layer: any) => layer.colorOptions && layer.colorOptions.length > 0)) ||
      (side.colorOptions && side.colorOptions.length > 0)
    );
  }, [selectedProduct]);
  const hasColorOptions = productColors.length > 0 || hasLayerColorOptions;

  // Redirect authenticated users to color-select when colors become available (initial load only)
  const [hasVisitedColorSelect, setHasVisitedColorSelect] = useState(false);
  useEffect(() => {
    if (isAuthenticated && hasColorOptions && currentStep === 'freeform-design' && !hasVisitedColorSelect) {
      setCurrentStep('color-select');
    }
    if (currentStep === 'color-select') {
      setHasVisitedColorSelect(true);
    }
  }, [isAuthenticated, hasColorOptions, currentStep, hasVisitedColorSelect]);

  const visibleSteps = useMemo(() => {
    let steps = STEPS;
    if (isAuthenticated) steps = steps.filter(s => s.id !== 'guest-info');
    steps = steps.filter(s => s.id !== 'product-select');
    if (!hasColorOptions) steps = steps.filter(s => s.id !== 'color-select');
    return steps;
  }, [hasColorOptions, isAuthenticated]);

  const currentStepIndex = visibleSteps.findIndex(s => s.id === currentStep);
  const progress = currentStep === 'success' ? 100 : ((currentStepIndex) / visibleSteps.length) * 100;

  // Product config for freeform editor
  const productConfig = useMemo(() => {
    if (!selectedProduct) return null;
    return {
      productId: selectedProduct.id,
      sides: selectedProduct.configuration || [],
    };
  }, [selectedProduct]);

  // Derive sides for color preview and freeform editor
  const colorPreviewSides = productConfig?.sides ?? [];
  const freeformSides = productConfig?.sides ?? [];
  const freeformSideIndex = freeformSides.findIndex(s => s.id === activeSideId);
  const validFreeformIndex = freeformSideIndex !== -1 ? freeformSideIndex : 0;
  const currentFreeformSide = freeformSides[validFreeformIndex];

  // Fetch product colors when product is selected
  useEffect(() => {
    if (!selectedProduct) {
      setProductColors([]);
      setSelectedColorHex(null);
      setColorPreviewIndex(0);
      return;
    }
    async function fetchColors() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('product_colors')
        .select('id, sort_order, manufacturer_color:manufacturer_colors(id, name, hex, color_code)')
        .eq('product_id', selectedProduct!.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error || !data) {
        setProductColors([]);
        return;
      }
      const colors = data
        .filter((d: any) => d.manufacturer_color)
        .map((d: any) => ({
          id: d.id,
          hex: d.manufacturer_color.hex,
          name: d.manufacturer_color.name,
          colorCode: d.manufacturer_color.color_code,
        }));
      setProductColors(colors);
      // Default to first color
      if (colors.length > 0) {
        setSelectedColorHex(colors[0].hex);
        setProductColor(colors[0].hex);
      }
    }
    fetchColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  // Auto-enable edit mode and initialize active side when entering freeform step
  useEffect(() => {
    if (currentStep === 'freeform-design') {
      setEditMode(true);
      const sides = selectedProduct?.configuration ?? [];
      if (sides.length > 0) {
        setActiveSide(sides[0].id);
      }
    } else {
      setEditMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, setEditMode, setActiveSide]);

  // Fetch the fixed product
  useEffect(() => {
    async function fetchProduct() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('id, title, base_price, configuration, size_options, category, is_active, is_featured, thumbnail_image_link, created_at, updated_at')
          .eq('id', FIXED_PRODUCT_ID)
          .single();

        if (error) throw error;
        setSelectedProduct(data);
        setTitle(`${data.title} 공동구매`);
      } catch (err) {
        console.error('Error fetching product:', err);
      }
    }
    fetchProduct();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).daum?.Postcode) {
      setIsPostcodeScriptLoaded(true);
    }
  }, []);

  // Auto-populate size dropdown when product is selected
  useEffect(() => {
    if (selectedProduct?.size_options && selectedProduct.size_options.length > 0) {
      const sizeField: CoBuyCustomField = {
        id: 'size-dropdown-fixed',
        type: 'dropdown',
        label: '사이즈',
        required: true,
        fixed: true,
        options: selectedProduct.size_options.map(s => s.label),
      };
      setCustomFields([sizeField]);
    }
  }, [selectedProduct]);

  const handleAddressSearch = (type: 'delivery' | 'pickup') => {
    if (!(window as any).daum?.Postcode) {
      alert('주소 검색 기능을 불러오는 중입니다.');
      return;
    }
    new (window as any).daum.Postcode({
      oncomplete: function(data: any) {
        const addressInfo: CoBuyAddressInfo = {
          roadAddress: data.roadAddress || data.jibunAddress,
          jibunAddress: data.jibunAddress,
          postalCode: data.zonecode,
          addressDetail: '',
        };
        if (type === 'delivery') {
          setDeliverySettings(prev => ({ ...prev, deliveryAddress: addressInfo }));
        } else {
          setDeliverySettings(prev => ({
            ...prev,
            pickupAddress: addressInfo,
            pickupLocation: data.roadAddress || data.jibunAddress,
          }));
        }
      }
    }).open();
  };

  const navigateToStep = useCallback((newStep: Step, direction: 'left' | 'right') => {
    setSlideDirection(direction);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 150);
  }, []);

  const stepOrder: Step[] = [
    'guest-info', 'product-select', 'color-select', 'freeform-design', 'title-description',
    'schedule-address', 'delivery-participants', 'review'
  ];

  const shouldSkipStep = (step: Step): boolean => {
    if (step === 'guest-info' && isAuthenticated) return true;
    if (step === 'product-select') return true;
    if (step === 'color-select' && !hasColorOptions) return true;
    return false;
  };

  const getNextStep = (fromStep: Step): Step | null => {
    const idx = stepOrder.indexOf(fromStep);
    if (idx >= stepOrder.length - 1) return null;
    const next = stepOrder[idx + 1];
    if (shouldSkipStep(next)) return getNextStep(next);
    return next;
  };

  const getPrevStep = (fromStep: Step): Step | null => {
    const idx = stepOrder.indexOf(fromStep);
    if (idx <= 0) return null;
    const prev = stepOrder[idx - 1];
    if (shouldSkipStep(prev)) return getPrevStep(prev);
    return prev;
  };

  const handleNext = async () => {
    if (currentStep === 'guest-info') {
      if (!guestName.trim()) { alert('이름을 입력해주세요.'); return; }
      if (!guestEmail.trim()) { alert('이메일을 입력해주세요.'); return; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) { alert('올바른 이메일 형식을 입력해주세요.'); return; }
    }
    if (currentStep === 'title-description' && !title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (currentStep === 'schedule-address') {
      if (!startDate || !endDate) { alert('시작일과 종료일을 선택해주세요.'); return; }
      if (new Date(endDate) <= new Date(startDate)) { alert('종료일은 시작일보다 나중이어야 합니다.'); return; }
      if (!receiveByDate) { alert('수령 희망일을 선택해주세요.'); return; }
      if (!deliverySettings.deliveryAddress?.roadAddress) { alert('배송받을 장소를 입력해주세요.'); return; }
      if (!deliverySettings.pickupAddress?.roadAddress) { alert('배부 장소를 입력해주세요.'); return; }
    }

    // Capture canvas state before leaving freeform step (canvases unmount after navigation)
    if (currentStep === 'freeform-design') {
      const states = serializeCanvasState();
      setSavedCanvasState(states);
      // Save both product-level color and any layer colors
      const colorData: Record<string, any> = { ...layerColors };
      if (selectedColorHex) {
        const selectedColor = productColors.find(c => c.hex === selectedColorHex);
        colorData._productColor = {
          hex: selectedColorHex,
          name: selectedColor?.name,
          colorCode: selectedColor?.colorCode,
        };
      }
      setSavedColorSelections(colorData);
      const preview = await generatePreview();
      setSavedPreviewUrl(preview);
    }

    const next = getNextStep(currentStep);
    if (next) navigateToStep(next, 'right');
  };

  const handleBack = () => {
    const prev = getPrevStep(currentStep);
    if (prev) navigateToStep(prev, 'left');
  };

  // Serialize canvas state for saving
  const serializeCanvasState = (): Record<string, string> => {
    const states: Record<string, string> = {};
    Object.entries(canvasMap).forEach(([sideId, canvas]) => {
      const userObjects = canvas.getObjects().filter((obj: any) => {
        if (obj.excludeFromExport) return false;
        if (obj.data?.id === 'background-product-image') return false;
        return true;
      });

      const canvasData = {
        version: canvas.toJSON().version,
        objects: userObjects.map((obj: any) => {
          const json = obj.toObject(['data']);
          if (obj.type === 'image') {
            json.src = obj.getSrc();
          }
          return json;
        }),
        layerColors: layerColors[sideId] || {},
      };

      states[sideId] = JSON.stringify(canvasData);
    });
    return states;
  };

  // Generate preview from canvas
  const generatePreview = async (): Promise<string | null> => {
    const firstCanvas = Object.values(canvasMap)[0];
    if (!firstCanvas) return null;

    try {
      const dataUrl = firstCanvas.toDataURL({ format: 'png', multiplier: 0.5 });
      const supabase = createClient();
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `cobuy-request-${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('user-designs')
        .upload(`previews/${fileName}`, blob, { contentType: 'image/png' });

      if (error) throw error;
      const { data: urlData } = supabase.storage.from('user-designs').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Failed to generate preview:', err);
      return null;
    }
  };

  const handleCreate = async () => {
    if (!selectedProduct) return;
    if (!isAuthenticated && (!guestName.trim() || !guestEmail.trim())) return;
    setIsCreating(true);

    try {
      const canvasState = savedCanvasState;
      const previewUrl = savedPreviewUrl;

      const schedulePreferences: CoBuyRequestSchedulePreferences = {
        preferredStartDate: startDate || undefined,
        preferredEndDate: endDate || undefined,
        receiveByDate: receiveByDate || undefined,
      };

      const quantityExpectations: CoBuyRequestQuantityExpectations = {
        minQuantity: minQuantity === '' ? undefined : Number(minQuantity),
        maxQuantity: maxQuantity === '' ? undefined : Number(maxQuantity),
      };

      const result = await createCoBuyRequest({
        productId: selectedProduct.id,
        title: title.trim(),
        description: description.trim() || undefined,
        freeformCanvasState: canvasState,
        freeformColorSelections: savedColorSelections,
        freeformPreviewUrl: previewUrl || undefined,
        schedulePreferences,
        quantityExpectations,
        deliveryPreferences: deliverySettings,
        customFields,
        isPublic,
        ...(!isAuthenticated ? {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim() || undefined,
        } : {}),
      });

      if (!result) throw new Error('Failed to create request');

      setCreatedShareToken(result.share_token);
      navigateToStep('success' as Step, 'right');
    } catch (error) {
      console.error('Error creating CoBuy request:', error);
      alert('요청 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async () => {
    if (!createdShareToken) return;
    const shareUrl = `${window.location.origin}/cobuy/request/${createdShareToken}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: '공동구매 요청 링크', url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch { /* ignore */ }
    }
  };

  // Freeform editor helpers
  const addFreeformText = async () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const fabric = await import('fabric');
    const text = new fabric.IText('텍스트', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Arial',
      fill: '#333',
      fontSize: 30,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    text.enterEditing();
  };

  const addFreeformImage = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const supabase = createClient();
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `freeform-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data, error } = await supabase.storage
          .from('user-designs')
          .upload(`images/${fileName}`, file, { contentType: file.type });
        if (error) { alert('이미지 업로드에 실패했습니다.'); return; }
        const { data: urlData } = supabase.storage.from('user-designs').getPublicUrl(data.path);
        const fabric = await import('fabric');
        const img = await fabric.FabricImage.fromURL(urlData.publicUrl, { crossOrigin: 'anonymous' });
        const maxW = canvas.width * 0.5;
        const maxH = canvas.height * 0.5;
        if (img.width > maxW || img.height > maxH) {
          img.scale(Math.min(maxW / img.width, maxH / img.height));
        }
        img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center' });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      } catch (err) {
        console.error('Error adding image:', err);
        alert('이미지 추가 중 오류가 발생했습니다.');
      }
    };
    input.click();
  };

  const deleteFreeformObject = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const toggleDrawingMode = async () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const newDrawing = !isDrawing;
    if (newDrawing) {
      const fabric = await import('fabric');
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = drawingColor;
      canvas.freeDrawingBrush.width = 3;
    } else {
      canvas.isDrawingMode = false;
    }
    setIsDrawing(newDrawing);
  };

  const changeDrawingColor = (color: string) => {
    setDrawingColor(color);
    const canvas = getActiveCanvas();
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
    }
  };

  // Undo/redo: only track user-added objects (not product images, guides, or layer filters)
  const isUserObject = (obj: any): boolean => {
    if (!obj) return false;
    if (obj.excludeFromExport) return false;
    if (obj.data?.id === 'background-product-image') return false;
    return true;
  };

  const getUserObjects = useCallback((canvas: any) =>
    canvas.getObjects().filter((obj: any) => isUserObject(obj)), []);

  const saveCanvasState = useCallback(() => {
    if (isUndoRedoing) return;
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const userObjs = getUserObjects(canvas);
    const serialized = userObjs.map((obj: any) => obj.toObject(['data', 'excludeFromExport']));
    const json = JSON.stringify(serialized);
    setCanvasHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, json];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [getActiveCanvas, getUserObjects, historyIndex, isUndoRedoing]);

  // Listen for user object changes to save history
  useEffect(() => {
    const canvas = getActiveCanvas();
    if (!canvas || currentStep !== 'freeform-design') return;
    if (canvasHistory.length === 0) {
      const userObjs = getUserObjects(canvas);
      const serialized = userObjs.map((obj: any) => obj.toObject(['data', 'excludeFromExport']));
      setCanvasHistory([JSON.stringify(serialized)]);
      setHistoryIndex(0);
    }
    const onChanged = (e: any) => {
      const target = e.target || e.path;
      if (target && !isUserObject(target)) return;
      saveCanvasState();
    };
    canvas.on('object:added', onChanged);
    canvas.on('object:modified', onChanged);
    canvas.on('object:removed', onChanged);
    canvas.on('path:created', onChanged);
    return () => {
      canvas.off('object:added', onChanged);
      canvas.off('object:modified', onChanged);
      canvas.off('object:removed', onChanged);
      canvas.off('path:created', onChanged);
    };
  }, [getActiveCanvas, getUserObjects, currentStep, saveCanvasState, canvasHistory.length]);

  const undo = useCallback(async () => {
    if (historyIndex <= 0) return;
    const canvas = getActiveCanvas();
    if (!canvas) return;
    setIsUndoRedoing(true);
    const prevIndex = historyIndex - 1;
    // Remove current user objects
    getUserObjects(canvas).forEach((obj: any) => canvas.remove(obj));
    // Restore saved user objects
    const savedObjects = JSON.parse(canvasHistory[prevIndex]);
    if (savedObjects.length > 0) {
      const fabric = await import('fabric');
      const objects = await fabric.util.enlivenObjects(savedObjects);
      objects.forEach((obj: any) => canvas.add(obj));
    }
    canvas.renderAll();
    setHistoryIndex(prevIndex);
    setIsUndoRedoing(false);
  }, [historyIndex, canvasHistory, getActiveCanvas, getUserObjects]);

  const redo = useCallback(async () => {
    if (historyIndex >= canvasHistory.length - 1) return;
    const canvas = getActiveCanvas();
    if (!canvas) return;
    setIsUndoRedoing(true);
    const nextIndex = historyIndex + 1;
    getUserObjects(canvas).forEach((obj: any) => canvas.remove(obj));
    const savedObjects = JSON.parse(canvasHistory[nextIndex]);
    if (savedObjects.length > 0) {
      const fabric = await import('fabric');
      const objects = await fabric.util.enlivenObjects(savedObjects);
      objects.forEach((obj: any) => canvas.add(obj));
    }
    canvas.renderAll();
    setHistoryIndex(nextIndex);
    setIsUndoRedoing(false);
  }, [historyIndex, canvasHistory, getActiveCanvas, getUserObjects]);

  // Disable drawing mode when leaving freeform step
  useEffect(() => {
    if (currentStep !== 'freeform-design' && isDrawing) {
      const canvas = getActiveCanvas();
      if (canvas) canvas.isDrawingMode = false;
      setIsDrawing(false);
    }
  }, [currentStep, isDrawing, getActiveCanvas]);

  const animationClass = isAnimating
    ? slideDirection === 'right' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4'
    : 'opacity-100 translate-x-0';

  return (
    <div className="fixed inset-0 bg-white lg:bg-gray-100/80 z-50 flex flex-col lg:items-center lg:justify-center">
      {/* Daum Postcode Script */}
      {!isPostcodeScriptLoaded && (
        <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" onLoad={() => setIsPostcodeScriptLoaded(true)} />
      )}

      <div className="flex-1 flex flex-col lg:flex-none lg:flex-row lg:w-full lg:max-w-5xl lg:max-h-[90vh] lg:mx-4 lg:bg-white lg:rounded-2xl lg:shadow-2xl lg:border lg:border-gray-200 lg:overflow-hidden">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-gray-50/80 border-r border-gray-200 p-6">
          <div className="mb-8">
            <h1 className="text-lg font-bold text-gray-900">공동구매 요청</h1>
            {selectedProduct && (
              <div className="mt-4 flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200">
                {selectedProduct.thumbnail_image_link && (
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                    <img src={selectedProduct.thumbnail_image_link} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{selectedProduct.title}</p>
                </div>
              </div>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto -mx-2">
            <div className="space-y-0.5 px-2">
              {visibleSteps.map((step, index) => {
                const isCurrent = step.id === currentStep;
                const isPast = currentStepIndex > index;
                const isSuccess = currentStep === ('success' as Step);
                return (
                  <div key={step.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isCurrent && !isSuccess ? 'bg-[#3B55A5]/10 text-[#3B55A5] font-semibold'
                    : isPast || isSuccess ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isCurrent && !isSuccess ? 'bg-[#3B55A5] text-white shadow-md shadow-[#3B55A5]/25'
                      : isPast || isSuccess ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'
                    }`}>
                      {isPast || isSuccess ? <Check className="w-3.5 h-3.5" /> : step.icon}
                    </div>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </nav>
          <button onClick={() => router.back()} disabled={isCreating} className="mt-4 w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50">
            취소하기
          </button>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header — hidden during freeform-design (Toolbar provides its own fixed top bar) */}
          {currentStep !== 'freeform-design' && (
            <header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
                <div>
                  <h1 className="text-base md:text-lg font-bold text-gray-900 lg:hidden">공동구매 요청</h1>
                  {currentStep !== 'product-select' && currentStep !== ('success' as Step) && (
                    <p className="text-xs md:text-sm text-gray-500">
                      {STEPS.find(s => s.id === currentStep)?.label}
                    </p>
                  )}
                </div>
                <button onClick={() => router.back()} disabled={isCreating} className="p-1.5 md:p-2 rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
                  <X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
                </button>
              </div>
              {currentStep !== ('success' as Step) && (
                <div className="px-4 pb-3 md:px-6 md:pb-4 lg:hidden">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5">{currentStepIndex + 1} / {visibleSteps.length}</p>
                </div>
              )}
            </header>
          )}

          {/* Content */}
          <main className={`flex-1 overflow-y-auto ${currentStep === 'freeform-design' ? 'flex flex-col' : ''}`}>
            <div className={`transition-all duration-150 ease-out ${animationClass} ${currentStep === 'freeform-design' ? 'flex-1 flex flex-col' : ''}`}>

              {/* Guest Info (non-authenticated users) */}
              {currentStep === 'guest-info' && (
                <div className="max-w-lg mx-auto py-8 px-4">
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                      <UserCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">기본 정보를 입력해주세요</h2>
                    <p className="text-sm text-gray-600">요청 확인 및 연락을 위해 필요해요.</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">이름 <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          placeholder="홍길동"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">이메일 <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={e => setGuestEmail(e.target.value)}
                          placeholder="example@email.com"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">전화번호</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={guestPhone}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                            const formatted = digits.length <= 3 ? digits : digits.length <= 7 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
                            setGuestPhone(formatted);
                          }}
                          placeholder="010-0000-0000"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Color Selection */}
              {currentStep === 'color-select' && selectedProduct && (
                <div className="max-w-lg mx-auto py-6 px-4 md:py-10 md:px-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">색상을 선택해주세요</h2>
                    <p className="text-sm text-gray-500">원하시는 제품 색상을 골라주세요.</p>
                  </div>

                  {/* Live product mockup preview with color applied */}
                  {colorPreviewSides.length > 0 && (
                    <div className="flex items-center justify-center bg-[#EBEBEB] rounded-xl mb-3 relative">
                      {colorPreviewSides.length > 1 && colorPreviewIndex > 0 && (
                        <button
                          onClick={() => setColorPreviewIndex(colorPreviewIndex - 1)}
                          className="absolute left-1.5 z-10 p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white transition"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                      )}

                      {colorPreviewSides.map((side, idx) => (
                        <div key={side.id} className={idx === colorPreviewIndex ? '' : 'hidden'}>
                          <SingleSideCanvas
                            side={side}
                            width={280}
                            height={340}
                            isEdit={false}
                            freeform={true}
                          />
                        </div>
                      ))}

                      {colorPreviewSides.length > 1 && colorPreviewIndex < colorPreviewSides.length - 1 && (
                        <button
                          onClick={() => setColorPreviewIndex(colorPreviewIndex + 1)}
                          className="absolute right-1.5 z-10 p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white transition"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Side name indicator */}
                  {colorPreviewSides.length > 1 && (
                    <p className="text-center text-[10px] text-gray-400 mb-3">
                      {colorPreviewSides[colorPreviewIndex]?.name} ({colorPreviewIndex + 1}/{colorPreviewSides.length})
                    </p>
                  )}

                  {/* Layer-based color selector (multi-layer products) */}
                  {hasLayerColorOptions && colorPreviewSides.length > 0 && (
                    <div className="space-y-3">
                      <LayerColorSelector side={colorPreviewSides[colorPreviewIndex]} />
                    </div>
                  )}

                  {/* Legacy product-level color swatches */}
                  {!hasLayerColorOptions && productColors.length > 0 && (
                    <>
                      {selectedColorHex && (
                        <p className="text-center text-sm font-medium text-gray-700 mb-3">
                          {productColors.find(c => c.hex === selectedColorHex)?.name}
                        </p>
                      )}
                      <div className="flex gap-2.5 flex-wrap justify-center">
                        {productColors.map(color => (
                          <ColorSwatch
                            key={color.id}
                            hex={color.hex}
                            selected={selectedColorHex === color.hex}
                            onClick={() => {
                              setSelectedColorHex(color.hex);
                              setProductColor(color.hex);
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Freeform Design — simplified editor */}
              {currentStep === 'freeform-design' && productConfig && currentFreeformSide && (
                <div className="flex flex-col min-h-full">
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
                    <button onClick={handleBack} className="text-sm text-gray-600 flex items-center gap-1">
                      <ArrowLeft className="w-4 h-4" /> 뒤로
                    </button>
                    {freeformSides.length > 1 && (
                      <span className="text-xs text-gray-400">
                        {currentFreeformSide.name} ({validFreeformIndex + 1}/{freeformSides.length})
                      </span>
                    )}
                    <button onClick={handleNext} className="text-sm font-semibold text-[#3B55A5]">
                      다음
                    </button>
                  </div>

                  {/* Canvas with side arrows — all sides rendered, only active visible */}
                  <div className="flex-1 flex items-center justify-center bg-[#EBEBEB] relative">
                    {freeformSides.length > 1 && validFreeformIndex > 0 && (
                      <button
                        onClick={() => setActiveSide(freeformSides[validFreeformIndex - 1].id)}
                        className="absolute left-1.5 z-10 p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white transition"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                    )}

                    {freeformSides.map((side, idx) => (
                      <div
                        key={side.id}
                        className={idx === validFreeformIndex ? '' : 'hidden'}
                      >
                        <SingleSideCanvas
                          side={side}
                          width={340}
                          height={420}
                          isEdit={true}
                          freeform={true}
                        />
                      </div>
                    ))}

                    {freeformSides.length > 1 && validFreeformIndex < freeformSides.length - 1 && (
                      <button
                        onClick={() => setActiveSide(freeformSides[validFreeformIndex + 1].id)}
                        className="absolute right-1.5 z-10 p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white transition"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-400 text-center py-1.5 bg-[#EBEBEB]">
                    자유롭게 배치해주세요. 참고용이며, 관리자가 실제 디자인을 제작합니다.
                  </p>

                  {/* Simple toolbar */}
                  <div className="flex flex-col items-center gap-1.5 py-2.5 bg-white border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={toggleDrawingMode} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition text-sm font-medium ${isDrawing ? 'bg-[#3B55A5] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                        <Pencil className="w-4 h-4" /> 그리기
                      </button>
                      <button onClick={() => { if (isDrawing) { const c = getActiveCanvas(); if (c) c.isDrawingMode = false; setIsDrawing(false); } addFreeformText(); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-sm font-medium text-gray-700">
                        <TextCursor className="w-4 h-4" /> 텍스트
                      </button>
                      <button onClick={() => { if (isDrawing) { const c = getActiveCanvas(); if (c) c.isDrawingMode = false; setIsDrawing(false); } addFreeformImage(); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-sm font-medium text-gray-700">
                        <ImagePlus className="w-4 h-4" /> 이미지
                      </button>
                      <button onClick={() => { if (isDrawing) { const c = getActiveCanvas(); if (c) c.isDrawingMode = false; setIsDrawing(false); } deleteFreeformObject(); }} className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-xl transition text-sm text-gray-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      {/* Drawing color picker */}
                      {isDrawing && (
                        <div className="flex items-center gap-1.5">
                          {[
                            { color: '#000000', label: '검정' },
                            { color: '#2563EB', label: '파랑' },
                            { color: '#DC2626', label: '빨강' },
                          ].map(({ color, label }) => (
                            <button
                              key={color}
                              onClick={() => changeDrawingColor(color)}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${drawingColor === color ? 'border-[#3B55A5] scale-110 shadow-sm' : 'border-gray-300'}`}
                              style={{ backgroundColor: color }}
                              aria-label={label}
                            />
                          ))}
                        </div>
                      )}
                      {/* Undo/Redo */}
                      <div className="flex items-center gap-1">
                        <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-30">
                          <Undo2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={redo} disabled={historyIndex >= canvasHistory.length - 1} className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-30">
                          <Redo2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Freeform tutorial modal */}
                  {showFreeformTutorial && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                      <div className="bg-white rounded-2xl max-w-sm w-full mx-4 shadow-2xl overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-[#3B55A5]" />
                            <h3 className="text-sm font-bold text-gray-900">디자인 가이드</h3>
                          </div>
                          <p className="text-sm text-gray-700 mb-4">
                            아래 이미지처럼 대략적인 스케치만 그려주세요!
                          </p>
                          <div className="flex gap-3 mb-3">
                            <img src="/tutorial/cobuy/sample_one.png" alt="예시 1" className="w-1/2 rounded-lg border border-gray-200" />
                            <img src="/tutorial/cobuy/sample_two.png" alt="예시 2" className="w-1/2 rounded-lg border border-gray-200" />
                          </div>
                          <p className="text-xs text-gray-400 text-center">
                            참고용이며, 관리자가 실제 디자인을 제작합니다.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowFreeformTutorial(false)}
                          className="w-full py-3 text-sm font-semibold text-white bg-[#3B55A5] hover:bg-[#2f4584] transition"
                        >
                          확인
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Title & Description */}
              {currentStep === 'title-description' && (
                <div className="max-w-lg mx-auto py-8 px-4">
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#3B55A5]/20 flex items-center justify-center mb-3">
                      <Tag className="w-5 h-5 text-[#3B55A5]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">제목 및 설명</h2>
                    <p className="text-sm text-gray-600">참여자들이 쉽게 알아볼 수 있는 제목을 입력해주세요.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">제목 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 24학번 과잠 공동구매"
                        className="w-full px-3 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#3B55A5] focus:ring-4 focus:ring-[#3B55A5]/10"
                        maxLength={100}
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">{title.length}/100자</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">설명 (선택)</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="예: 이번 MT 단체티입니다!"
                        className="w-full px-3 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#3B55A5] focus:ring-4 focus:ring-[#3B55A5]/10 resize-none"
                        rows={3}
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-500 mt-1">{description.length}/500자</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule & Addresses */}
              {currentStep === 'schedule-address' && (
                <div className="max-w-lg mx-auto py-8 px-4">
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">일정 및 장소</h2>
                  </div>
                  <div className="space-y-6">
                    {/* Schedule */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">일정</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">시작일 <span className="text-red-500">*</span></label>
                          <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="w-full px-2 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">종료일 <span className="text-red-500">*</span></label>
                          <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="w-full px-2 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">수령 희망일 <span className="text-red-500">*</span></label>
                        <input type="datetime-local" value={receiveByDate} onChange={e => setReceiveByDate(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-3 border-t border-gray-200 pt-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">배송 주소</p>
                      <p className="text-xs text-gray-500">공장에서 제품을 배송받을 주소예요.</p>
                      <div className="flex gap-2">
                        <input type="text" value={deliverySettings.deliveryAddress?.postalCode || ''} readOnly
                          className="w-24 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50" placeholder="우편번호" />
                        <button type="button" onClick={() => handleAddressSearch('delivery')}
                          className="flex-1 px-3 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium flex items-center justify-center gap-1.5 text-sm">
                          <Search className="w-4 h-4" /> 주소 검색
                        </button>
                      </div>
                      {deliverySettings.deliveryAddress?.roadAddress && (
                        <div className="space-y-2">
                          <input type="text" value={deliverySettings.deliveryAddress.roadAddress} readOnly className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50" />
                          <input type="text" value={deliverySettings.deliveryAddress.addressDetail || ''}
                            onChange={e => setDeliverySettings(prev => ({ ...prev, deliveryAddress: prev.deliveryAddress ? { ...prev.deliveryAddress, addressDetail: e.target.value } : undefined }))}
                            placeholder="상세주소" className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" maxLength={100} />
                        </div>
                      )}
                    </div>

                    {/* Pickup Address */}
                    <div className="space-y-3 border-t border-gray-200 pt-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">배부 장소</p>
                      <p className="text-xs text-gray-500">참여자들이 물품을 수령할 장소예요.</p>
                      <div className="flex gap-2">
                        <input type="text" value={deliverySettings.pickupAddress?.postalCode || ''} readOnly
                          className="w-24 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50" placeholder="우편번호" />
                        <button type="button" onClick={() => handleAddressSearch('pickup')}
                          className="flex-1 px-3 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-medium flex items-center justify-center gap-1.5 text-sm">
                          <Search className="w-4 h-4" /> 주소 검색
                        </button>
                      </div>
                      {deliverySettings.pickupAddress?.roadAddress && (
                        <div className="space-y-2">
                          <input type="text" value={deliverySettings.pickupAddress.roadAddress} readOnly className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50" />
                          <input type="text" value={deliverySettings.pickupAddress.addressDetail || ''}
                            onChange={e => setDeliverySettings(prev => ({
                              ...prev,
                              pickupAddress: prev.pickupAddress ? { ...prev.pickupAddress, addressDetail: e.target.value } : undefined,
                              pickupLocation: prev.pickupAddress ? `${prev.pickupAddress.roadAddress} ${e.target.value}`.trim() : ''
                            }))}
                            placeholder="상세주소" className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500" maxLength={100} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Option & Participant Info */}
              {currentStep === 'delivery-participants' && (
                <div className="max-w-lg mx-auto py-8 px-4">
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
                      <Gift className="w-5 h-5 text-teal-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">배송 및 참여자 정보</h2>
                  </div>
                  <div className="space-y-6">
                    {/* Delivery Option */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">배송 옵션</p>
                      {[
                        { enabled: false, icon: <MapPin className="w-4 h-4" />, label: '직접 수령만', desc: '모든 참여자가 지정된 장소에서 수령해요.' },
                        { enabled: true, icon: <Truck className="w-4 h-4" />, label: '개별 배송 허용', desc: '참여자가 배송비를 내고 배송받을 수 있어요.' },
                      ].map(opt => (
                        <button key={String(opt.enabled)} onClick={() => setDeliverySettings(prev => ({ ...prev, enabled: opt.enabled }))}
                          className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${deliverySettings.enabled === opt.enabled ? 'border-[#3B55A5] bg-[#3B55A5]/10 ring-4 ring-[#3B55A5]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${deliverySettings.enabled === opt.enabled ? 'bg-[#3B55A5] text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {opt.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm">{opt.label}</span>
                                {deliverySettings.enabled === opt.enabled && <Check className="w-4 h-4 text-[#3B55A5]" />}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{opt.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                      {deliverySettings.enabled && (
                        <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-teal-800">배송비</span>
                            <span className="text-sm font-semibold text-teal-700">₩4,000</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Fields */}
                    <div className="space-y-3 border-t border-gray-200 pt-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">참여자 정보 수집</p>
                      <div className="bg-violet-50 rounded-xl p-3 border border-violet-200">
                        <p className="text-xs font-medium text-violet-800 mb-2">빠른 추가</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['이니셜', '학번', '연락처'].map(label => (
                            <button key={label} onClick={() => {
                              if (customFields.length >= 10) return;
                              setCustomFields([...customFields, { id: `field-${Date.now()}`, type: 'text', label, required: false }]);
                            }} className="px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 text-violet-700">
                              + {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <CustomFieldBuilder fields={customFields} onChange={setCustomFields} maxFields={10} />
                      <p className="text-xs text-gray-500">* 사이즈 선택은 자동으로 추가되어 있어요</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Review */}
              {currentStep === 'review' && (
                <div className="max-w-lg mx-auto py-8 px-4">
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">요청 내용 확인</h2>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    {!isAuthenticated && (
                      <div className="pb-3 border-b border-gray-200">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">요청자 정보</p>
                        <p className="text-sm font-medium text-gray-900">{guestName}</p>
                        <p className="text-xs text-gray-600">{guestEmail}</p>
                        {guestPhone && <p className="text-xs text-gray-600">{guestPhone}</p>}
                      </div>
                    )}
                    <div className="pb-3 border-b border-gray-200">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">제품</p>
                      <p className="font-semibold text-gray-900 text-sm">{selectedProduct?.title}</p>
                      {selectedColorHex && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: selectedColorHex }} />
                          <span className="text-xs text-gray-600">{productColors.find(c => c.hex === selectedColorHex)?.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="pb-3 border-b border-gray-200">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">기본 정보</p>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
                    </div>
                    <div className="pb-3 border-b border-gray-200">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">일정</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-gray-500">시작</p><p className="font-medium">{startDate ? new Date(startDate).toLocaleDateString('ko-KR') : '-'}</p></div>
                        <div><p className="text-gray-500">종료</p><p className="font-medium">{endDate ? new Date(endDate).toLocaleDateString('ko-KR') : '-'}</p></div>
                      </div>
                    </div>
                    {deliverySettings.deliveryAddress && (
                      <div className="pb-3 border-b border-gray-200">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">배송/수령</p>
                        <p className="text-xs text-gray-600">{deliverySettings.deliveryAddress.roadAddress} {deliverySettings.deliveryAddress.addressDetail}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">수집 정보 ({customFields.length}개)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {customFields.map(f => (
                          <span key={f.id} className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs">
                            {f.label}{f.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success */}
              {currentStep === ('success' as Step) && createdShareToken && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-green-500/25">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">요청이 제출되었어요!</h1>
                  <p className="text-base text-gray-600 mb-6">관리자가 디자인을 제작한 후 알려드릴게요.</p>
                  <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-3 mb-6">
                    <p className="text-[10px] font-medium text-gray-500 mb-1.5">요청 확인 링크</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-700 truncate bg-white px-2 py-1.5 rounded-lg border border-gray-200">
                        {typeof window !== 'undefined' ? `${window.location.origin}/cobuy/request/${createdShareToken}` : ''}
                      </code>
                      <button onClick={handleShare} className={`p-1.5 rounded-lg transition-all ${linkCopied ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                        {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full max-w-sm">
                    <button onClick={handleShare} className="flex-1 py-3 border-2 border-gray-200 rounded-2xl font-semibold hover:bg-gray-50 flex items-center justify-center gap-1.5 text-sm">
                      <Share2 className="w-4 h-4" /> 공유하기
                    </button>
                    <button onClick={() => router.push('/home/my-page/cobuy')} className="flex-1 py-3 bg-gradient-to-r from-[#3B55A5] to-[#2D4280] text-white rounded-2xl font-semibold flex items-center justify-center gap-1.5 text-sm">
                      확인 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Footer Navigation */}
          {currentStep !== ('success' as Step) && currentStep !== 'freeform-design' && (
            <footer className="shrink-0 border-t border-gray-200 bg-white p-3 safe-area-inset-bottom">
              <div className="max-w-lg mx-auto space-y-2">
                <div className="flex gap-2">
                  {getPrevStep(currentStep) !== null && (
                    <button onClick={handleBack} className="py-3 px-5 border-2 border-gray-200 rounded-2xl font-semibold hover:bg-gray-50 flex items-center gap-1.5 text-sm text-gray-700">
                      <ArrowLeft className="w-4 h-4" /> 이전
                    </button>
                  )}
                  {currentStep !== 'review' ? (
                    <button onClick={handleNext}
                      className="flex-1 py-3 bg-gradient-to-r from-[#3B55A5] to-[#2D4280] text-white rounded-2xl font-semibold hover:from-[#2D4280] hover:to-[#243366] shadow-lg shadow-[#3B55A5]/25 flex items-center justify-center gap-1.5 text-sm">
                      다음 <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={handleCreate} disabled={isCreating}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-semibold shadow-lg shadow-green-500/25 flex items-center justify-center gap-1.5 text-sm disabled:opacity-50">
                      {isCreating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 제출 중...</> : <><Sparkles className="w-4 h-4" /> 요청 제출</>}
                    </button>
                  )}
                </div>
              </div>
            </footer>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Color swatch button
// ============================================================================

function ColorSwatch({ hex, selected, onClick }: { hex: string; selected: boolean; onClick: () => void }) {
  const c = hex.replace('#', '');
  const lum = (0.299 * parseInt(c.substring(0, 2), 16) + 0.587 * parseInt(c.substring(2, 4), 16) + 0.114 * parseInt(c.substring(4, 6), 16)) / 255;
  const checkColor = lum > 0.5 ? '#000' : '#FFF';

  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 shrink-0 transition-all ${selected ? 'border-[#3B55A5] scale-110 shadow-md' : 'border-gray-200 hover:scale-105'}`}
      style={{ backgroundColor: hex }}
    >
      {selected && (
        <svg className="w-full h-full p-2" fill="none" stroke={checkColor} strokeWidth="3" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
