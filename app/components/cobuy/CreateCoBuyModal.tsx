'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowLeft, ArrowRight, Users, CheckCircle2, Share2 } from 'lucide-react';
import { CoBuyCustomField, SizeOption } from '@/types/types';
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
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [customFields, setCustomFields] = useState<CoBuyCustomField[]>([]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCurrentStep('confirm');
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setMaxParticipants('');
        setCustomFields([]);
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
        options: design.product.size_options?.map(size => size.label) || [],
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
        maxParticipants: maxParticipants === '' ? null : Number(maxParticipants),
        customFields,
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                <label className="block text-sm font-medium mb-2">최대 참여 인원 (선택)</label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="제한 없음"
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  비워두면 인원 제한이 없습니다
                </p>
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
                        type: 'dropdown',
                        label: '수령 방법',
                        required: false,
                        options: ['직접 수령', '배송'],
                      };
                      setCustomFields([...customFields, newField]);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    + 수령 방법
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
                  <p className="text-sm text-gray-500">최대 참여 인원</p>
                  <p className="text-sm font-medium">
                    {maxParticipants === '' ? '제한 없음' : `${maxParticipants}명`}
                  </p>
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
