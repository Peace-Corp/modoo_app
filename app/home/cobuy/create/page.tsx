'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import {
  X, ArrowLeft, ArrowRight, Users, CheckCircle2, Share2, Plus, Trash2,
  Truck, MapPin, Search, Package, Globe, Lock, Calendar, Tag, FileText,
  Sparkles, Gift, ChevronRight, Check, Copy, AlertCircle
} from 'lucide-react';
import { CoBuyCustomField, SizeOption, CoBuyPricingTier, CoBuyDeliverySettings, CoBuyAddressInfo } from '@/types/types';
import { createCoBuySession } from '@/lib/cobuyService';
import CustomFieldBuilder from '@/app/components/cobuy/CustomFieldBuilder';
import type { CoBuySession } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/store/useAuthStore';

interface SavedDesign {
  id: string;
  title: string | null;
  preview_url: string | null;
  price_per_item: number;
  product: {
    id: string;
    title: string;
    size_options?: SizeOption[];
  };
}

// Generate pricing tiers based on base price
const generatePricingTiers = (basePrice: number): CoBuyPricingTier[] => {
  // Round to nearest 1000
  const roundTo1000 = (n: number) => Math.round(n / 1000) * 1000;

  return [
    { minQuantity: 10, pricePerItem: basePrice },
    { minQuantity: 30, pricePerItem: roundTo1000(basePrice * 0.95) }, // 5% discount
    { minQuantity: 50, pricePerItem: roundTo1000(basePrice * 0.90) }, // 10% discount
    { minQuantity: 100, pricePerItem: roundTo1000(basePrice * 0.85) }, // 15% discount
  ];
};

type Step =
  | 'welcome'
  | 'title'
  | 'description'
  | 'visibility'
  | 'schedule'
  | 'pricing'
  | 'quantity'
  | 'delivery-address'
  | 'pickup-address'
  | 'delivery-option'
  | 'custom-fields'
  | 'review'
  | 'success';

const STEPS: { id: Step; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'welcome', label: '시작', icon: <Sparkles className="w-4 h-4" />, group: '시작' },
  { id: 'title', label: '제목', icon: <Tag className="w-4 h-4" />, group: '기본 정보' },
  { id: 'description', label: '설명', icon: <FileText className="w-4 h-4" />, group: '기본 정보' },
  { id: 'visibility', label: '공개 설정', icon: <Globe className="w-4 h-4" />, group: '기본 정보' },
  { id: 'schedule', label: '일정', icon: <Calendar className="w-4 h-4" />, group: '일정' },
  { id: 'pricing', label: '가격 구간', icon: <Tag className="w-4 h-4" />, group: '가격' },
  { id: 'quantity', label: '수량 제한', icon: <Package className="w-4 h-4" />, group: '가격' },
  { id: 'delivery-address', label: '배송 주소', icon: <Truck className="w-4 h-4" />, group: '배송' },
  { id: 'pickup-address', label: '배부 장소', icon: <MapPin className="w-4 h-4" />, group: '배송' },
  { id: 'delivery-option', label: '배송 옵션', icon: <Gift className="w-4 h-4" />, group: '배송' },
  { id: 'custom-fields', label: '참여자 정보', icon: <Users className="w-4 h-4" />, group: '추가 정보' },
  { id: 'review', label: '최종 확인', icon: <CheckCircle2 className="w-4 h-4" />, group: '완료' },
];

export default function CreateCoBuyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get('designId');
  const { isAuthenticated, user } = useAuthStore();

  // Design loading state
  const [design, setDesign] = useState<SavedDesign | null>(null);
  const [isLoadingDesign, setIsLoadingDesign] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<CoBuySession | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [receiveByDate, setReceiveByDate] = useState('');
  const [minQuantity, setMinQuantity] = useState<number | ''>('');
  const [maxQuantity, setMaxQuantity] = useState<number | ''>('');
  const [pricingTiers, setPricingTiers] = useState<CoBuyPricingTier[]>([]);
  const [customFields, setCustomFields] = useState<CoBuyCustomField[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<CoBuyDeliverySettings>({
    enabled: false,
    deliveryFee: 4000,
    pickupLocation: '',
    deliveryAddress: undefined,
    pickupAddress: undefined,
  });
  const [isPublic, setIsPublic] = useState(false);
  const [isPostcodeScriptLoaded, setIsPostcodeScriptLoaded] = useState(false);

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = currentStep === 'success' ? 100 : ((currentStepIndex) / STEPS.length) * 100;

  // Fetch design data
  useEffect(() => {
    async function fetchDesign() {
      if (!designId) {
        setLoadError('디자인 ID가 없습니다.');
        setIsLoadingDesign(false);
        return;
      }

      if (!isAuthenticated) {
        setLoadError('로그인이 필요합니다.');
        setIsLoadingDesign(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('saved_designs')
          .select(`
            id,
            title,
            preview_url,
            price_per_item,
            product:products (
              id,
              title,
              size_options
            )
          `)
          .eq('id', designId)
          .single();

        if (error || !data) {
          setLoadError('디자인을 찾을 수 없습니다.');
          return;
        }

        // Verify ownership
        const { data: ownershipCheck } = await supabase
          .from('saved_designs')
          .select('user_id')
          .eq('id', designId)
          .eq('user_id', user?.id)
          .single();

        if (!ownershipCheck) {
          setLoadError('이 디자인에 대한 접근 권한이 없습니다.');
          return;
        }

        setDesign({
          id: data.id,
          title: data.title,
          preview_url: data.preview_url,
          price_per_item: data.price_per_item,
          product: Array.isArray(data.product) ? data.product[0] : data.product,
        });

        // Auto-populate title
        const productData = Array.isArray(data.product) ? data.product[0] : data.product;
        setTitle(`${data.title || productData?.title || ''} 공동구매`);

        // Initialize pricing tiers based on design's base price
        setPricingTiers(generatePricingTiers(data.price_per_item));

        // Add size dropdown field
        const sizeField: CoBuyCustomField = {
          id: 'size-dropdown-fixed',
          type: 'dropdown',
          label: '사이즈',
          required: true,
          fixed: true,
          options: productData?.size_options || [],
        };
        setCustomFields([sizeField]);

      } catch (err) {
        console.error('Error fetching design:', err);
        setLoadError('디자인을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoadingDesign(false);
      }
    }

    fetchDesign();
  }, [designId, isAuthenticated, user?.id]);

  // Pricing tier handlers
  const addPricingTier = () => {
    const lastTier = pricingTiers[pricingTiers.length - 1];
    const basePrice = design?.price_per_item || 25000;
    const newMinQuantity = lastTier ? lastTier.minQuantity + 50 : 10;
    // Decrease by ~5% from last tier, rounded to 1000, with minimum of 1000
    const newPrice = lastTier
      ? Math.max(1000, Math.round((lastTier.pricePerItem * 0.95) / 1000) * 1000)
      : basePrice;
    setPricingTiers([...pricingTiers, { minQuantity: newMinQuantity, pricePerItem: newPrice }]);
  };

  const updatePricingTier = (index: number, field: 'minQuantity' | 'pricePerItem', value: number) => {
    const newTiers = [...pricingTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    newTiers.sort((a, b) => a.minQuantity - b.minQuantity);
    setPricingTiers(newTiers);
  };

  const removePricingTier = (index: number) => {
    if (pricingTiers.length <= 1) return;
    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
  };

  // Check if Daum Postcode script is already loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).daum?.Postcode) {
      setIsPostcodeScriptLoaded(true);
    }
  }, []);

  const handleDeliveryAddressSearch = () => {
    if (!(window as any).daum?.Postcode) {
      alert('주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
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
        setDeliverySettings(prev => ({
          ...prev,
          deliveryAddress: addressInfo,
        }));
      }
    }).open();
  };

  const handlePickupAddressSearch = () => {
    if (!(window as any).daum?.Postcode) {
      alert('주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
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
        setDeliverySettings(prev => ({
          ...prev,
          pickupAddress: addressInfo,
          pickupLocation: data.roadAddress || data.jibunAddress,
        }));
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

  const handleClose = () => {
    if (!isCreating) {
      router.back();
    }
  };

  const getNextStep = (): Step | null => {
    const steps: Step[] = ['welcome', 'title', 'description', 'visibility', 'schedule', 'pricing', 'quantity', 'delivery-address', 'pickup-address', 'delivery-option', 'custom-fields', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      return steps[currentIndex + 1];
    }
    return null;
  };

  const getPrevStep = (): Step | null => {
    const steps: Step[] = ['welcome', 'title', 'description', 'visibility', 'schedule', 'pricing', 'quantity', 'delivery-address', 'pickup-address', 'delivery-option', 'custom-fields', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      return steps[currentIndex - 1];
    }
    return null;
  };

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 'title' && !title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (currentStep === 'schedule') {
      if (!startDate || !endDate) {
        alert('시작일과 종료일을 선택해주세요.');
        return;
      }
      if (new Date(endDate) <= new Date(startDate)) {
        alert('종료일은 시작일보다 나중이어야 합니다.');
        return;
      }
      if (!receiveByDate) {
        alert('수령 희망일을 선택해주세요.');
        return;
      }
    }
    if (currentStep === 'pricing' && pricingTiers.length === 0) {
      alert('최소 하나의 가격 구간을 설정해주세요.');
      return;
    }
    if (currentStep === 'delivery-address' && !deliverySettings.deliveryAddress?.roadAddress) {
      alert('배송받을 장소를 입력해주세요.');
      return;
    }
    if (currentStep === 'pickup-address' && !deliverySettings.pickupAddress?.roadAddress) {
      alert('배부 장소를 입력해주세요.');
      return;
    }
    if (currentStep === 'custom-fields' && customFields.length > 10) {
      alert('커스텀 필드는 최대 10개까지 추가할 수 있습니다.');
      return;
    }

    const nextStep = getNextStep();
    if (nextStep) {
      navigateToStep(nextStep, 'right');
    }
  };

  const handleBack = () => {
    const prevStep = getPrevStep();
    if (prevStep) {
      navigateToStep(prevStep, 'left');
    }
  };

  const handleCreate = async () => {
    if (!design) return;

    setIsCreating(true);

    try {
      const result = await createCoBuySession({
        savedDesignId: design.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        receiveByDate: receiveByDate ? new Date(receiveByDate) : null,
        minQuantity: minQuantity === '' ? null : Number(minQuantity),
        maxQuantity: maxQuantity === '' ? null : Number(maxQuantity),
        pricingTiers,
        customFields,
        deliverySettings,
        isPublic,
      });

      if (!result) {
        throw new Error('Failed to create CoBuy session');
      }

      setCreatedSession(result);
      navigateToStep('success', 'right');
    } catch (error) {
      console.error('Error creating CoBuy session:', error);
      alert('공동구매 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async () => {
    if (!createdSession) return;

    const shareUrl = `${window.location.origin}/cobuy/${createdSession.share_token}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: createdSession.title,
          text: '공동구매 링크를 공유해보세요.',
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Share failed:', error);
      try {
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (clipboardError) {
        console.error('Clipboard write failed:', clipboardError);
        alert('공유에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // Loading state
  if (isLoadingDesign) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">디자인을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !design) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했어요</h2>
          <p className="text-gray-600 mb-6">{loadError || '디자인을 불러올 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/home/designs')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            디자인 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    const animationClass = isAnimating
      ? slideDirection === 'right' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4'
      : 'opacity-100 translate-x-0';

    return (
      <div className={`transition-all duration-150 ease-out ${animationClass}`}>
        {/* Welcome */}
        {currentStep === 'welcome' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 md:px-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 md:mb-8 shadow-lg shadow-blue-500/25">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">공동구매를 시작해볼까요?</h1>
            <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 max-w-md leading-relaxed">
              함께 구매하면 더 저렴해요!<br />
              친구들과 함께 할 수 있는 공동구매 링크를 만들어보세요.
            </p>

            {/* Design Preview Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 w-full max-w-sm border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 md:mb-3">선택된 디자인</p>
              <div className="flex items-center gap-3 md:gap-4">
                {design.preview_url && (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0">
                    <img src={design.preview_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm md:text-base">{design.title || design.product.title}</p>
                  <p className="text-xs md:text-sm text-gray-500">기본가 ₩{design.price_per_item.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* What you'll set up */}
            <div className="text-left w-full max-w-sm mb-6 md:mb-8">
              <p className="text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">설정할 항목들</p>
              <div className="space-y-2">
                {[
                  { icon: <Tag className="w-3.5 h-3.5 md:w-4 md:h-4" />, text: '공동구매 제목과 설명' },
                  { icon: <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />, text: '시작일, 종료일, 수령일' },
                  { icon: <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />, text: '수량별 가격 설정' },
                  { icon: <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />, text: '배송 및 수령 장소' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 md:gap-3 text-gray-600">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      {item.icon}
                    </div>
                    <span className="text-xs md:text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full max-w-sm py-3 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <span>시작하기</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        )}

        {/* Title Step */}
        {currentStep === 'title' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3 md:mb-4">
                <Tag className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">공동구매 제목을 정해주세요</h2>
              <p className="text-sm md:text-base text-gray-600">
                참여자들이 쉽게 알아볼 수 있는 제목을 입력해주세요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 24학번 과잠 공동구매"
                  className="w-full px-3 py-3 md:px-4 md:py-4 text-base md:text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  maxLength={100}
                  autoFocus
                />
                <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2">{title.length}/100자</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-amber-800">
                  <strong>💡 팁:</strong> 구체적인 제목이 참여율을 높여요!<br />
                  예: &ldquo;컴공과 24학번 MT 단체티&rdquo; 처럼요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Description Step */}
        {currentStep === 'description' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3 md:mb-4">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">설명을 추가해볼까요?</h2>
              <p className="text-sm md:text-base text-gray-600">
                공동구매에 대한 추가 설명을 적어주세요. (선택사항)
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  설명 <span className="text-gray-400">(선택)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 이번 MT 단체티입니다! 사이즈는 넉넉하게 주문해주세요."
                  className="w-full px-3 py-3 md:px-4 md:py-4 text-base md:text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2">{description.length}/500자</p>
              </div>

              <button
                onClick={handleNext}
                className="text-xs md:text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                건너뛰기 →
              </button>
            </div>
          </div>
        )}

        {/* Visibility Step */}
        {currentStep === 'visibility' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3 md:mb-4">
                <Globe className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">공개 범위를 선택해주세요</h2>
              <p className="text-sm md:text-base text-gray-600">
                공동구매를 누구에게 공개할지 선택해주세요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <button
                onClick={() => setIsPublic(false)}
                className={`w-full p-4 md:p-6 rounded-2xl border-2 text-left transition-all ${
                  !isPublic
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${
                    !isPublic ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Lock className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm md:text-base">비공개</span>
                      {!isPublic && <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      링크를 가진 사람만 참여할 수 있어요.<br />
                      친구나 동아리 멤버와 공유하기 좋아요.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setIsPublic(true)}
                className={`w-full p-4 md:p-6 rounded-2xl border-2 text-left transition-all ${
                  isPublic
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${
                    isPublic ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Globe className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm md:text-base">공개</span>
                      {isPublic && <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      누구나 공동구매 목록에서 발견할 수 있어요.<br />
                      더 많은 참여자를 모집할 수 있어요.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Schedule Step */}
        {currentStep === 'schedule' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-3 md:mb-4">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">일정을 설정해주세요</h2>
              <p className="text-sm md:text-base text-gray-600">
                공동구매 시작일, 종료일, 그리고 수령 예정일을 알려주세요.
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                    시작일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                    종료일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 md:pt-6">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                  수령 희망일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={receiveByDate}
                  onChange={(e) => setReceiveByDate(e.target.value)}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                />
                <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2">
                  참여자들에게 예상 수령 시기를 안내해요
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-blue-800">
                  <strong>📅 참고:</strong> 종료일 이후에는 더 이상 참여를 받지 않아요. 충분한 기간을 설정해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Step */}
        {currentStep === 'pricing' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3 md:mb-4">
                <Tag className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">수량별 가격을 설정해주세요</h2>
              <p className="text-sm md:text-base text-gray-600">
                주문 수량에 따라 단가를 다르게 설정할 수 있어요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="space-y-2 md:space-y-3">
                {pricingTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1 flex items-center gap-1.5 md:gap-2">
                      <input
                        type="number"
                        value={tier.minQuantity}
                        onChange={(e) => updatePricingTier(idx, 'minQuantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 md:w-20 px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-2 border-gray-200 rounded-lg text-center font-medium focus:outline-none focus:border-emerald-500"
                        min="1"
                      />
                      <span className="text-xs md:text-sm text-gray-600">벌 이상</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="text-xs md:text-sm text-gray-500">₩</span>
                      <input
                        type="number"
                        value={tier.pricePerItem}
                        onChange={(e) => updatePricingTier(idx, 'pricePerItem', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 md:w-28 px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-2 border-gray-200 rounded-lg text-right font-medium focus:outline-none focus:border-emerald-500"
                        min="0"
                        step="1000"
                      />
                    </div>
                    {pricingTiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePricingTier(idx)}
                        className="p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPricingTier}
                className="w-full py-2.5 md:py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                단가 구간 추가
              </button>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-emerald-800">
                  <strong>💰 팁:</strong> 수량이 많을수록 단가를 낮게 설정하면 더 많은 참여를 유도할 수 있어요!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quantity Limits Step */}
        {currentStep === 'quantity' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-3 md:mb-4">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-cyan-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">수량 제한을 설정할까요?</h2>
              <p className="text-sm md:text-base text-gray-600">
                최소/최대 주문 수량을 설정할 수 있어요. (선택사항)
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                    최소 수량
                  </label>
                  <input
                    type="number"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="제한 없음"
                    min="1"
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">이 수량 이상이어야 공구 진행</p>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                    최대 수량
                  </label>
                  <input
                    type="number"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="제한 없음"
                    min="1"
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">비워두면 제한 없음</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
                <p className="font-medium text-gray-900 text-xs md:text-sm">💡 수량 설정 예시</p>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600">•</span>
                    <span><strong>최소만 설정:</strong> 30벌 이상 모이면 진행</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600">•</span>
                    <span><strong>최대만 설정:</strong> 100벌까지만 받음</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600">•</span>
                    <span><strong>둘 다 같게:</strong> 딱 50벌만 (가격 확정)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleNext}
                className="text-xs md:text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                건너뛰기 (제한 없음) →
              </button>
            </div>
          </div>
        )}

        {/* Delivery Address Step */}
        {currentStep === 'delivery-address' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            {/* Load Daum Postcode Script */}
            {!isPostcodeScriptLoaded && (
              <Script
                src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
                strategy="lazyOnload"
                onLoad={() => setIsPostcodeScriptLoaded(true)}
              />
            )}

            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-3 md:mb-4">
                <Truck className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">배송받을 주소를 알려주세요</h2>
              <p className="text-sm md:text-base text-gray-600">
                공동구매 주최자로서 제품을 배송받을 주소예요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deliverySettings.deliveryAddress?.postalCode || ''}
                  readOnly
                  className="w-24 md:w-28 px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  placeholder="우편번호"
                />
                <button
                  type="button"
                  onClick={handleDeliveryAddressSearch}
                  className="flex-1 px-3 py-2.5 md:px-4 md:py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
                >
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                  주소 검색
                </button>
              </div>

              {deliverySettings.deliveryAddress?.roadAddress && (
                <div className="space-y-2 md:space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    value={deliverySettings.deliveryAddress.roadAddress}
                    readOnly
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl bg-gray-50"
                  />
                  <input
                    type="text"
                    value={deliverySettings.deliveryAddress.addressDetail || ''}
                    onChange={(e) => setDeliverySettings(prev => ({
                      ...prev,
                      deliveryAddress: prev.deliveryAddress ? {
                        ...prev.deliveryAddress,
                        addressDetail: e.target.value
                      } : undefined
                    }))}
                    placeholder="상세주소 (동/호수, 건물명 등)"
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    maxLength={100}
                  />
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-indigo-800">
                  <strong>📦 참고:</strong> 이 주소로 공장에서 제품을 배송받아요. 배송 후 참여자들에게 배부해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pickup Address Step */}
        {currentStep === 'pickup-address' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pink-100 flex items-center justify-center mb-3 md:mb-4">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-pink-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">배부 장소를 알려주세요</h2>
              <p className="text-sm md:text-base text-gray-600">
                참여자들이 물품을 수령할 장소예요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deliverySettings.pickupAddress?.postalCode || ''}
                  readOnly
                  className="w-24 md:w-28 px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  placeholder="우편번호"
                />
                <button
                  type="button"
                  onClick={handlePickupAddressSearch}
                  className="flex-1 px-3 py-2.5 md:px-4 md:py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition font-medium flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
                >
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                  주소 검색
                </button>
              </div>

              {deliverySettings.pickupAddress?.roadAddress && (
                <div className="space-y-2 md:space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    value={deliverySettings.pickupAddress.roadAddress}
                    readOnly
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl bg-gray-50"
                  />
                  <input
                    type="text"
                    value={deliverySettings.pickupAddress.addressDetail || ''}
                    onChange={(e) => setDeliverySettings(prev => ({
                      ...prev,
                      pickupAddress: prev.pickupAddress ? {
                        ...prev.pickupAddress,
                        addressDetail: e.target.value
                      } : undefined,
                      pickupLocation: prev.pickupAddress ?
                        `${prev.pickupAddress.roadAddress} ${e.target.value}`.trim() : ''
                    }))}
                    placeholder="상세주소 (동/호수, 건물명 등)"
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all"
                    maxLength={100}
                  />
                </div>
              )}

              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-pink-800">
                  <strong>📍 팁:</strong> 학교, 동아리방, 회사 등 참여자들이 쉽게 찾아올 수 있는 장소가 좋아요!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Option Step */}
        {currentStep === 'delivery-option' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-3 md:mb-4">
                <Gift className="w-5 h-5 md:w-6 md:h-6 text-teal-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">개별 배송을 허용할까요?</h2>
              <p className="text-sm md:text-base text-gray-600">
                참여자가 직접 수령하지 않고 배송을 선택할 수 있게 해요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <button
                onClick={() => setDeliverySettings(prev => ({ ...prev, enabled: false }))}
                className={`w-full p-4 md:p-6 rounded-2xl border-2 text-left transition-all ${
                  !deliverySettings.enabled
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${
                    !deliverySettings.enabled ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm md:text-base">직접 수령만</span>
                      {!deliverySettings.enabled && <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      모든 참여자가 지정된 장소에서 수령해요.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setDeliverySettings(prev => ({ ...prev, enabled: true }))}
                className={`w-full p-4 md:p-6 rounded-2xl border-2 text-left transition-all ${
                  deliverySettings.enabled
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${
                    deliverySettings.enabled ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Truck className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm md:text-base">개별 배송 허용</span>
                      {deliverySettings.enabled && <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      참여자가 배송비를 추가로 내고 배송받을 수 있어요.
                    </p>
                  </div>
                </div>
              </button>

              {deliverySettings.enabled && (
                <div className="p-3 md:p-4 bg-teal-50 rounded-xl border border-teal-200 animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs md:text-sm font-medium text-teal-800 mb-1.5 md:mb-2">
                    배송비
                  </label>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className="text-teal-600 text-sm md:text-base">₩</span>
                    <input
                      type="number"
                      value={deliverySettings.deliveryFee}
                      onChange={(e) => setDeliverySettings(prev => ({
                        ...prev,
                        deliveryFee: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      className="w-28 md:w-32 px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-2 border-teal-200 rounded-lg text-right font-medium focus:outline-none focus:border-teal-500"
                      min="0"
                      step="500"
                    />
                    <span className="text-xs md:text-sm text-teal-600">원</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Fields Step */}
        {currentStep === 'custom-fields' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-3 md:mb-4">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">참여자 정보를 수집해요</h2>
              <p className="text-sm md:text-base text-gray-600">
                참여자에게 추가로 받고 싶은 정보가 있나요?
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* Quick Add Buttons */}
              <div className="bg-violet-50 rounded-xl p-3 md:p-4 border border-violet-200">
                <p className="text-xs md:text-sm font-medium text-violet-800 mb-2 md:mb-3">빠른 추가</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {['이니셜', '학번', '연락처'].map((label) => (
                    <button
                      key={label}
                      onClick={() => {
                        if (customFields.length >= 10) {
                          alert('최대 10개까지만 추가할 수 있습니다.');
                          return;
                        }
                        const newField: CoBuyCustomField = {
                          id: `field-${Date.now()}`,
                          type: 'text',
                          label,
                          required: false,
                        };
                        setCustomFields([...customFields, newField]);
                      }}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-white border border-violet-200 rounded-lg text-xs md:text-sm font-medium hover:bg-violet-100 transition-colors text-violet-700"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>

              <CustomFieldBuilder
                fields={customFields}
                onChange={setCustomFields}
                maxFields={10}
              />

              <p className="text-xs md:text-sm text-gray-500">
                * 사이즈 선택은 자동으로 추가되어 있어요
              </p>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div className="max-w-lg mx-auto py-8 px-4 md:py-12 md:px-6">
            <div className="mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 md:mb-4">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">모든 준비가 완료됐어요!</h2>
              <p className="text-sm md:text-base text-gray-600">
                입력하신 정보를 확인해주세요.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 md:p-5 space-y-3 md:space-y-4">
                {/* Basic Info */}
                <div className="pb-3 md:pb-4 border-b border-gray-200">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">기본 정보</p>
                  <p className="font-semibold text-gray-900 text-sm md:text-base">{title}</p>
                  {description && <p className="text-xs md:text-sm text-gray-600 mt-1">{description}</p>}
                  <div className="flex items-center gap-1.5 md:gap-2 mt-2">
                    {isPublic ? (
                      <>
                        <Globe className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                        <span className="text-xs md:text-sm text-blue-600">공개</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />
                        <span className="text-xs md:text-sm text-gray-600">비공개</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div className="pb-3 md:pb-4 border-b border-gray-200">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">일정</p>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                    <div>
                      <p className="text-gray-500">시작</p>
                      <p className="font-medium">{new Date(startDate).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">종료</p>
                      <p className="font-medium">{new Date(endDate).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">수령 예정</p>
                      <p className="font-medium">{new Date(receiveByDate).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="pb-3 md:pb-4 border-b border-gray-200">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">가격 구간</p>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {pricingTiers.map((tier, idx) => (
                      <span key={idx} className="bg-emerald-100 text-emerald-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium">
                        {tier.minQuantity}벌↑ ₩{tier.pricePerItem.toLocaleString()}
                      </span>
                    ))}
                  </div>
                  {(minQuantity || maxQuantity) && (
                    <p className="text-xs md:text-sm text-gray-600 mt-2">
                      수량: {minQuantity || '제한없음'} ~ {maxQuantity || '제한없음'}
                    </p>
                  )}
                </div>

                {/* Delivery */}
                <div className="pb-3 md:pb-4 border-b border-gray-200">
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">배송/수령</p>
                  {deliverySettings.deliveryAddress && (
                    <p className="text-xs md:text-sm text-gray-600">
                      📦 {deliverySettings.deliveryAddress.roadAddress} {deliverySettings.deliveryAddress.addressDetail}
                    </p>
                  )}
                  {deliverySettings.pickupAddress && (
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      📍 {deliverySettings.pickupAddress.roadAddress} {deliverySettings.pickupAddress.addressDetail}
                    </p>
                  )}
                  {deliverySettings.enabled && (
                    <p className="text-xs md:text-sm text-emerald-600 mt-2">
                      ✓ 개별 배송 가능 (₩{deliverySettings.deliveryFee.toLocaleString()})
                    </p>
                  )}
                </div>

                {/* Custom Fields */}
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">
                    수집 정보 ({customFields.length}개)
                  </p>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {customFields.map((field) => (
                      <span key={field.id} className="bg-violet-100 text-violet-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4">
                <p className="text-xs md:text-sm text-amber-800">
                  <strong>⚠️ 확인:</strong> 생성 후에도 일부 정보는 수정할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {currentStep === 'success' && createdSession && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 md:px-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mb-6 md:mb-8 shadow-lg shadow-green-500/25 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              공동구매가 생성됐어요! 🎉
            </h1>
            <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              링크를 공유하고 친구들을 초대해보세요.
            </p>

            {/* Share URL Card */}
            <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-3 md:p-4 mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-1.5 md:mb-2">공유 링크</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs md:text-sm text-gray-700 truncate bg-white px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-200">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/cobuy/${createdSession.share_token}`}
                </code>
                <button
                  onClick={handleShare}
                  className={`p-1.5 md:p-2 rounded-lg transition-all ${
                    linkCopied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {linkCopied ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
              {linkCopied && (
                <p className="text-xs md:text-sm text-green-600 mt-1.5 md:mt-2 animate-in fade-in duration-200">
                  링크가 복사되었어요!
                </p>
              )}
            </div>

            <div className="flex gap-2 md:gap-3 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 py-3 md:py-4 border-2 border-gray-200 rounded-2xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                <span>공유하기</span>
              </button>

              <Link
                href={`/home/my-page/cobuy/${createdSession.id}`}
                className="flex-1 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
              >
                <span>관리하기</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3 md:gap-4">
            {currentStep !== 'welcome' && currentStep !== 'success' && (
              <button
                onClick={handleBack}
                className="p-1.5 md:p-2 -ml-1.5 md:-ml-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-base md:text-lg font-bold text-gray-900">공동구매 만들기</h1>
              {currentStep !== 'welcome' && currentStep !== 'success' && (
                <p className="text-xs md:text-sm text-gray-500">
                  {STEPS.find(s => s.id === currentStep)?.label}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-1.5 md:p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        {currentStep !== 'success' && (
          <div className="px-4 pb-3 md:px-6 md:pb-4">
            <div className="h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1.5 md:mt-2">
              {currentStepIndex + 1} / {STEPS.length}
            </p>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {renderStepContent()}
      </main>

      {/* Footer Navigation */}
      {currentStep !== 'welcome' && currentStep !== 'success' && (
        <footer className="shrink-0 border-t border-gray-200 bg-white p-3 md:p-4 safe-area-inset-bottom">
          <div className="max-w-lg mx-auto flex gap-2 md:gap-3">
            {currentStep !== 'review' ? (
              <button
                onClick={handleNext}
                className="flex-1 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
              >
                <span>다음</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 py-3 md:py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                    <span>공동구매 만들기</span>
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
