'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { X, ArrowLeft, ArrowRight, Users, CheckCircle2, Share2, Info, Plus, Trash2, Truck, MapPin, Search, Package } from 'lucide-react';
import { CoBuyCustomField, SizeOption, CoBuyPricingTier, CoBuyDeliverySettings, CoBuyAddressInfo } from '@/types/types';
import { createCoBuySession } from '@/lib/cobuyService';
import CustomFieldBuilder from './CustomFieldBuilder';
import type { CoBuySession } from '@/types/types';

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

// Default pricing tiers (can be customized per product later)
const DEFAULT_PRICING_TIERS: CoBuyPricingTier[] = [
  { minQuantity: 10, pricePerItem: 25000 },
  { minQuantity: 30, pricePerItem: 22000 },
  { minQuantity: 50, pricePerItem: 20000 },
  { minQuantity: 100, pricePerItem: 18000 },
];

interface CreateCoBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: SavedDesign | null;
}

type Step = 'confirm' | 'basic-info' | 'custom-fields' | 'review' | 'success';

export default function CreateCoBuyModal({
  isOpen,
  onClose,
  design,
}: CreateCoBuyModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('confirm');
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<CoBuySession | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [receiveByDate, setReceiveByDate] = useState('');
  const [minQuantity, setMinQuantity] = useState<number | ''>('');
  const [maxQuantity, setMaxQuantity] = useState<number | ''>('');
  const [pricingTiers, setPricingTiers] = useState<CoBuyPricingTier[]>(DEFAULT_PRICING_TIERS);
  const [customFields, setCustomFields] = useState<CoBuyCustomField[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<CoBuyDeliverySettings>({
    enabled: false,
    deliveryFee: 4000,
    pickupLocation: '',
    deliveryAddress: undefined,
    pickupAddress: undefined,
  });
  const [isPostcodeScriptLoaded, setIsPostcodeScriptLoaded] = useState(false);

  // Pricing tier handlers
  const addPricingTier = () => {
    const lastTier = pricingTiers[pricingTiers.length - 1];
    const newMinQuantity = lastTier ? lastTier.minQuantity + 50 : 10;
    const newPrice = lastTier ? Math.max(1000, lastTier.pricePerItem - 2000) : 25000;
    setPricingTiers([...pricingTiers, { minQuantity: newMinQuantity, pricePerItem: newPrice }]);
  };

  const updatePricingTier = (index: number, field: 'minQuantity' | 'pricePerItem', value: number) => {
    const newTiers = [...pricingTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    // Sort by minQuantity
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

  // Handle Daum Postcode API address search for delivery address (배송받을 장소)
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

  // Handle Daum Postcode API address search for pickup address (배부 장소)
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
          // Also update pickupLocation for backward compatibility
          pickupLocation: data.roadAddress || data.jibunAddress,
        }));
      }
    }).open();
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCurrentStep('confirm');
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setReceiveByDate('');
        setMinQuantity('');
        setMaxQuantity('');
        setPricingTiers(DEFAULT_PRICING_TIERS);
        setCustomFields([]);
        setDeliverySettings({ enabled: false, deliveryFee: 4000, pickupLocation: '', deliveryAddress: undefined, pickupAddress: undefined });
        setCreatedSession(null);
      }, 300); // Wait for modal close animation
    }
  }, [isOpen]);

  // Auto-populate title from design
  useEffect(() => {
    if (isOpen && design && !title) {
      setTitle(`${design.title || design.product.title} 공동구매`);
    }
  }, [isOpen, design, title]);

  // Add size dropdown field automatically when modal opens
  useEffect(() => {
    if (isOpen && design && customFields.length === 0) {
      // Add fixed size dropdown field
      const sizeField: CoBuyCustomField = {
        id: 'size-dropdown-fixed',
        type: 'dropdown',
        label: '사이즈',
        required: true,
        fixed: true,
        options: design.product.size_options || [],
      };

      setCustomFields([sizeField]);
    }
  }, [isOpen, design, customFields.length]);

  if (!isOpen || !design) return null;

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  const handleNext = () => {
    if (currentStep === 'confirm') {
      setCurrentStep('basic-info');
    } else if (currentStep === 'basic-info') {
      // Validate basic info
      if (!title.trim()) {
        alert('제목을 입력해주세요.');
        return;
      }
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
      if (!deliverySettings.deliveryAddress?.roadAddress) {
        alert('배송받을 장소를 입력해주세요.');
        return;
      }
      if (!deliverySettings.pickupAddress?.roadAddress) {
        alert('배부 장소를 입력해주세요.');
        return;
      }
      setCurrentStep('custom-fields');
    } else if (currentStep === 'custom-fields') {
      // Validate custom fields (max 10)
      if (customFields.length > 10) {
        alert('커스텀 필드는 최대 10개까지 추가할 수 있습니다.');
        return;
      }
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'basic-info') {
      setCurrentStep('confirm');
    } else if (currentStep === 'custom-fields') {
      setCurrentStep('basic-info');
    } else if (currentStep === 'review') {
      setCurrentStep('custom-fields');
    }
  };

  const handleCreate = async () => {
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
      });

      if (!result) {
        throw new Error('Failed to create CoBuy session');
      }

      setCreatedSession(result);
      setCurrentStep('success');
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
    } catch (error) {
      console.error('Share failed:', error);
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('링크가 복사되었습니다.');
      } catch (clipboardError) {
        console.error('Clipboard write failed:', clipboardError);
        alert('공유에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4 pb-25">
      <div className="bg-white rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">공동구매 만들기</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Success */}
          {currentStep === 'success' && createdSession && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-2xl font-bold mb-2">공동구매가 생성되었어요!</h3>
              <p className="text-gray-600 mb-8">링크를 공유하고 참여 현황을 확인해보세요.</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  <span>공유하기</span>
                </button>

                <Link
                  href={`/home/my-page/cobuy/${createdSession.id}`}
                  onClick={() => onClose()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>관리 페이지</span>
                </Link>
              </div>
            </div>
          )}

          {/* Step 1: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h3 className="text-2xl font-bold mb-2">공동구매를 실행하시겠어요?</h3>
              <p className="text-gray-600 mb-6">
                이 디자인으로 공동구매 링크를 만들어 친구들과 공유할 수 있습니다.
              </p>

              {/* Design Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">선택된 디자인</p>
                <p className="font-bold">{design.title || design.product.title}</p>
                <p className="text-sm text-gray-600">₩{design.price_per_item.toLocaleString()}</p>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>시작하기</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {currentStep === 'basic-info' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="공동구매 제목을 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">설명 (선택)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="공동구매에 대한 설명을 입력하세요"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    시작일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    종료일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  수령 희망일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={receiveByDate}
                  onChange={(e) => setReceiveByDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  참여자에게 물품 수령 예정 시기를 안내합니다 (종료일 이후 가능)
                </p>
              </div>

              {/* Pricing Tiers Editor */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">수량별 단가 설정</p>
                    <p className="text-sm text-gray-600 mt-1">
                      주문 수량에 따른 단가를 설정하세요. 참여자들에게 이 정보가 표시됩니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {pricingTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="number"
                          value={tier.minQuantity}
                          onChange={(e) => updatePricingTier(idx, 'minQuantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 px-2 py-1.5 border rounded text-sm text-center"
                          min="1"
                        />
                        <span className="text-sm text-gray-600">벌 이상</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">₩</span>
                        <input
                          type="number"
                          value={tier.pricePerItem}
                          onChange={(e) => updatePricingTier(idx, 'pricePerItem', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-24 px-2 py-1.5 border rounded text-sm text-right"
                          min="0"
                          step="1000"
                        />
                      </div>
                      {pricingTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePricingTier(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPricingTier}
                  className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  단가 구간 추가
                </button>

                <p className="text-xs text-gray-500 mt-3">
                  * 수량이 많을수록 단가가 낮아지도록 설정하는 것이 일반적입니다
                </p>
              </div>

              {/* Quantity Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    최소 수량 (선택)
                  </label>
                  <input
                    type="number"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="제한 없음"
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    공구 진행에 필요한 최소 수량
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    최대 수량 (선택)
                  </label>
                  <input
                    type="number"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="제한 없음"
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    비워두면 수량 제한 없음
                  </p>
                </div>
              </div>

              {/* Load Daum Postcode Script */}
              {!isPostcodeScriptLoaded && (
                <Script
                  src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
                  strategy="lazyOnload"
                  onLoad={() => setIsPostcodeScriptLoaded(true)}
                />
              )}

              {/* Delivery Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">수령 및 배송 설정</p>
                    <p className="text-sm text-gray-600 mt-1">
                      배송받을 장소와 배부 장소를 입력하고, 개별 배송 허용 여부를 설정하세요.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  {/* 배송받을 장소 - Delivery Address (where organizer receives products) */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Package className="w-4 h-4 inline-block mr-1" />
                      배송받을 장소 <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      제품을 배송받을 주소입니다 (공동구매 주최자가 받을 장소)
                    </p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={deliverySettings.deliveryAddress?.postalCode || ''}
                        readOnly
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                        placeholder="우편번호"
                      />
                      <button
                        type="button"
                        onClick={handleDeliveryAddressSearch}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm flex items-center gap-1.5"
                      >
                        <Search className="w-4 h-4" />
                        주소 검색
                      </button>
                    </div>
                    {deliverySettings.deliveryAddress?.roadAddress && (
                      <>
                        <input
                          type="text"
                          value={deliverySettings.deliveryAddress.roadAddress}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 mb-2"
                          placeholder="도로명 주소"
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
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={100}
                        />
                      </>
                    )}
                  </div>

                  {/* 배부 장소 - Pickup Address (where participants pick up orders) */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-2">
                      <MapPin className="w-4 h-4 inline-block mr-1" />
                      배부 장소 <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      참여자들이 물품을 수령할 장소입니다
                    </p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={deliverySettings.pickupAddress?.postalCode || ''}
                        readOnly
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                        placeholder="우편번호"
                      />
                      <button
                        type="button"
                        onClick={handlePickupAddressSearch}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm flex items-center gap-1.5"
                      >
                        <Search className="w-4 h-4" />
                        주소 검색
                      </button>
                    </div>
                    {deliverySettings.pickupAddress?.roadAddress && (
                      <>
                        <input
                          type="text"
                          value={deliverySettings.pickupAddress.roadAddress}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 mb-2"
                          placeholder="도로명 주소"
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
                            // Also update pickupLocation for backward compatibility
                            pickupLocation: prev.pickupAddress ?
                              `${prev.pickupAddress.roadAddress} ${e.target.value}`.trim() : ''
                          }))}
                          placeholder="상세주소 (동/호수, 건물명 등)"
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={100}
                        />
                      </>
                    )}
                  </div>

                  {/* Enable separate delivery toggle */}
                  <div className="border-t pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deliverySettings.enabled}
                        onChange={(e) => setDeliverySettings(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">개별 배송 허용</span>
                        <p className="text-xs text-gray-500">참여자가 직접 수령 대신 배송을 선택할 수 있습니다</p>
                      </div>
                    </label>

                    {deliverySettings.enabled && (
                      <div className="mt-3 pl-8 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">배송비:</span>
                        <span className="text-sm font-medium">₩{deliverySettings.deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Strategy Tips */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900 mb-2">💡 가격 설정 팁</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>가격 고정:</strong> 최소/최대 수량을 같게 설정하면 단가가 확정됩니다</li>
                  <li>• <strong>단가 할인:</strong> 최대 수량을 비워두고 참여자를 더 모아 단가를 낮출 수 있습니다</li>
                  <li>• <strong>차액 환불:</strong> 임시 가격으로 결제 후, 최종 단가 확정 시 차액을 환불합니다</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>이전</span>
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>다음</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Custom Fields */}
          {currentStep === 'custom-fields' && (
            <div className="space-y-4 overflow-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="font-medium text-blue-900 mb-1">참여자 정보 수집</p>
                    <p className="text-sm text-blue-700">
                      참여자들에게 받고 싶은 정보를 추가하세요.
                    </p>
                    <p className='text-sm text-blue-700'>(eg. 이니셜, 학번, 이름).</p>
                  </div>
                </div>
              </div>

              {/* Quick Add Buttons */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">자주 사용하는 항목 빠르게 추가</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (customFields.length >= 10) {
                        alert('최대 10개까지만 추가할 수 있습니다.');
                        return;
                      }
                      const newField: CoBuyCustomField = {
                        id: `field-${Date.now()}`,
                        type: 'text',
                        label: '이니셜',
                        required: false,
                      };
                      setCustomFields([...customFields, newField]);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    + 이니셜
                  </button>
                  <button
                    onClick={() => {
                      if (customFields.length >= 10) {
                        alert('최대 10개까지만 추가할 수 있습니다.');
                        return;
                      }
                      const newField: CoBuyCustomField = {
                        id: `field-${Date.now()}`,
                        type: 'text',
                        label: '학번',
                        required: false,
                      };
                      setCustomFields([...customFields, newField]);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    + 학번
                  </button>
                </div>
              </div>

              <CustomFieldBuilder
                fields={customFields}
                onChange={setCustomFields}
                maxFields={10}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>이전</span>
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>다음</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-lg mb-4">공동구매 정보 확인</h3>

                <div>
                  <p className="text-sm text-gray-500">제목</p>
                  <p className="font-medium">{title}</p>
                </div>

                {description && (
                  <div>
                    <p className="text-sm text-gray-500">설명</p>
                    <p className="text-sm">{description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">시작일</p>
                    <p className="text-sm font-medium">
                      {new Date(startDate).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">종료일</p>
                    <p className="text-sm font-medium">
                      {new Date(endDate).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">수령 희망일</p>
                  <p className="text-sm font-medium">
                    {new Date(receiveByDate).toLocaleString('ko-KR')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">최소 수량</p>
                    <p className="text-sm font-medium">
                      {minQuantity === '' ? '제한 없음' : `${minQuantity}벌`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">최대 수량</p>
                    <p className="text-sm font-medium">
                      {maxQuantity === '' ? '제한 없음' : `${maxQuantity}벌`}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">수량별 단가</p>
                  <div className="flex flex-wrap gap-2">
                    {pricingTiers.map((tier, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {tier.minQuantity}벌↑ ₩{tier.pricePerItem.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">수집할 정보 ({customFields.length}개)</p>
                  <div className="space-y-2">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-gray-500">({field.type})</span>
                        {field.required && <span className="text-red-500">*</span>}
                        {field.fixed && <span className="text-blue-500">(고정)</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">수령 및 배송</p>
                  <div className="space-y-2">
                    {deliverySettings.deliveryAddress && (
                      <div>
                        <p className="text-xs text-gray-400">배송받을 장소</p>
                        <p className="text-sm text-gray-600">
                          {deliverySettings.deliveryAddress.roadAddress}
                          {deliverySettings.deliveryAddress.addressDetail && ` ${deliverySettings.deliveryAddress.addressDetail}`}
                        </p>
                      </div>
                    )}
                    {deliverySettings.pickupAddress && (
                      <div>
                        <p className="text-xs text-gray-400">배부 장소</p>
                        <p className="text-sm text-gray-600">
                          {deliverySettings.pickupAddress.roadAddress}
                          {deliverySettings.pickupAddress.addressDetail && ` ${deliverySettings.pickupAddress.addressDetail}`}
                        </p>
                      </div>
                    )}
                    {deliverySettings.enabled ? (
                      <p className="text-sm font-medium text-green-600">
                        ✓ 개별 배송 허용 (배송비: ₩{deliverySettings.deliveryFee.toLocaleString()})
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">직접 수령만 가능</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ 공동구매를 생성하면 링크가 생성됩니다. 링크를 공유하여 참여자를 모집하세요.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  disabled={isCreating}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>이전</span>
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? '생성 중...' : '공동구매 만들기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
