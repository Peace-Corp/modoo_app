'use client'

import React, { useState } from 'react';
import { CoBuyCustomField, CoBuySelectedItem, CoBuyPricingTier } from '@/types/types';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface ParticipantFormProps {
  customFields: CoBuyCustomField[];
  sizeOptions: string[];
  onSubmit: (data: ParticipantFormData) => void;
  isSubmitting?: boolean;
  pricePerItem?: number;
  pricingTiers?: CoBuyPricingTier[];
  currentTotalQuantity?: number; // Current total quantity in the session
}

export interface ParticipantFormData {
  name: string;
  email: string;
  phone?: string;
  selectedSize: string; // Legacy - primary size for backward compatibility
  selectedItems: CoBuySelectedItem[]; // New - supports multiple sizes with quantities
  fieldResponses: Record<string, string>;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({
  customFields,
  sizeOptions,
  onSubmit,
  isSubmitting = false,
  pricePerItem = 0,
  pricingTiers = [],
  currentTotalQuantity = 0,
}) => {
  const [formData, setFormData] = useState<ParticipantFormData>({
    name: '',
    email: '',
    phone: '',
    selectedSize: '',
    selectedItems: [{ size: '', quantity: 1 }], // Start with one item
    fieldResponses: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (fieldId: string, value: string) => {
    if (fieldId === 'name' || fieldId === 'email' || fieldId === 'phone' || fieldId === 'selectedSize') {
      setFormData(prev => ({ ...prev, [fieldId]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        fieldResponses: { ...prev.fieldResponses, [fieldId]: value }
      }));
    }

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  };

  // Handle selected items (size + quantity)
  const handleItemSizeChange = (index: number, size: string) => {
    setFormData(prev => {
      const newItems = [...prev.selectedItems];
      newItems[index] = { ...newItems[index], size };
      // Update legacy selectedSize with the first item's size
      const selectedSize = newItems[0]?.size || '';
      return { ...prev, selectedItems: newItems, selectedSize };
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`item-${index}-size`];
      return newErrors;
    });
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    setFormData(prev => {
      const newItems = [...prev.selectedItems];
      newItems[index] = { ...newItems[index], quantity: Math.max(1, quantity) };
      return { ...prev, selectedItems: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      selectedItems: [...prev.selectedItems, { size: '', quantity: 1 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.selectedItems.length <= 1) return; // Keep at least one item
    setFormData(prev => {
      const newItems = prev.selectedItems.filter((_, i) => i !== index);
      // Update legacy selectedSize with the first item's size
      const selectedSize = newItems[0]?.size || '';
      return { ...prev, selectedItems: newItems, selectedSize };
    });
  };

  const getTotalQuantity = () => {
    return formData.selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Calculate price per item based on total quantity and pricing tiers
  const getApplicablePricePerItem = (quantity: number) => {
    if (pricingTiers.length === 0) return pricePerItem;

    // Calculate projected total quantity (current session total + this order)
    const projectedTotal = currentTotalQuantity + quantity;

    // Sort tiers by minQuantity descending to find the highest applicable tier
    const sortedTiers = [...pricingTiers].sort((a, b) => b.minQuantity - a.minQuantity);

    // Find the highest tier that applies to the projected total
    const applicableTier = sortedTiers.find(tier => projectedTotal >= tier.minQuantity);

    return applicableTier?.pricePerItem ?? pricePerItem;
  };

  const getCurrentPricePerItem = () => {
    return getApplicablePricePerItem(getTotalQuantity());
  };

  const getTotalPrice = () => {
    return getTotalQuantity() * getCurrentPricePerItem();
  };

  // Get the next tier info for displaying potential savings
  const getNextTierInfo = () => {
    if (pricingTiers.length === 0) return null;

    const currentQuantity = getTotalQuantity();
    const projectedTotal = currentTotalQuantity + currentQuantity;
    const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);

    // Find the next tier that hasn't been reached yet
    const nextTier = sortedTiers.find(tier => projectedTotal < tier.minQuantity);

    if (!nextTier) return null;

    const quantityNeeded = nextTier.minQuantity - projectedTotal;
    return {
      quantityNeeded,
      nextPrice: nextTier.pricePerItem,
      minQuantity: nextTier.minQuantity,
    };
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate built-in fields
    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    // Validate selected items (size + quantity)
    formData.selectedItems.forEach((item, index) => {
      if (!item.size) {
        newErrors[`item-${index}-size`] = '사이즈를 선택해주세요';
      }
      if (item.quantity < 1) {
        newErrors[`item-${index}-quantity`] = '수량은 1 이상이어야 합니다';
      }
    });

    // Validate custom fields
    customFields.forEach(field => {
      if (field.fixed) return; // Skip size field as it's validated above

      const value = formData.fieldResponses[field.id];

      if (field.required && (!value || !value.trim())) {
        newErrors[field.id] = `${field.label}을(를) 입력해주세요`;
        return;
      }

      if (value && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field.id] = '올바른 이메일 형식이 아닙니다';
      }

      if (value && field.type === 'phone' && !/^[0-9-+()]*$/.test(value)) {
        newErrors[field.id] = '올바른 전화번호 형식이 아닙니다';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: CoBuyCustomField) => {
    if (field.fixed && field.type === 'dropdown') {
      // This is the size field - handled separately
      return null;
    }

    const value = formData.fieldResponses[field.id] || '';

    return (
      <div key={field.id} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.type === 'dropdown' && field.options ? (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={field.required}
          >
            <option value="">선택해주세요</option>
            {field.options.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : field.type === 'email' ? (
          <input
            type="email"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`${field.label}을(를) 입력하세요`}
            required={field.required}
          />
        ) : field.type === 'phone' ? (
          <input
            type="tel"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="010-1234-5678"
            required={field.required}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`${field.label}을(를) 입력하세요`}
            required={field.required}
          />
        )}

        {errors[field.id] && (
          <p className="text-red-500 text-xs mt-1">{errors[field.id]}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Built-in fields */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="이름을 입력하세요"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          이메일 <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="example@email.com"
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          전화번호
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="010-1234-5678"
        />
        {errors.phone && (
          <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Size and Quantity selector (multi-item support) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          사이즈 및 수량 <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">
          여러 사이즈를 구매하려면 &apos;추가&apos; 버튼을 눌러주세요
        </p>

        <div className="space-y-3">
          {formData.selectedItems.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              {/* Size dropdown */}
              <div className="flex-1">
                <select
                  value={item.size}
                  onChange={(e) => handleItemSizeChange(index, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[`item-${index}-size`] ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">사이즈 선택</option>
                  {sizeOptions.map((size, idx) => (
                    <option key={idx} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors[`item-${index}-size`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`item-${index}-size`]}</p>
                )}
              </div>

              {/* Quantity controls */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleItemQuantityChange(index, item.quantity - 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                  disabled={item.quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 min-w-10 text-center font-medium">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleItemQuantityChange(index, item.quantity + 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Remove button (only show if more than 1 item) */}
              {formData.selectedItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add another size button */}
        <button
          type="button"
          onClick={addItem}
          className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          다른 사이즈 추가
        </button>

        {/* Total summary */}
        {getTotalQuantity() > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">총 수량</span>
              <span className="font-bold text-blue-600">{getTotalQuantity()}벌</span>
            </div>
            {(pricePerItem > 0 || pricingTiers.length > 0) && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">단가</span>
                  <span className="font-medium text-blue-600">₩{getCurrentPricePerItem().toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1 border-t border-blue-200">
                  <span className="text-gray-700 font-medium">예상 결제 금액</span>
                  <span className="font-bold text-blue-600 text-lg">₩{getTotalPrice().toLocaleString()}</span>
                </div>
              </>
            )}
            {/* Next tier hint */}
            {getNextTierInfo() && (
              <div className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1.5 mt-2">
                💡 {getNextTierInfo()?.quantityNeeded}벌 더 모이면 단가 ₩{getNextTierInfo()?.nextPrice?.toLocaleString()}으로 할인!
              </div>
            )}
          </div>
        )}

        {/* Pricing tiers display */}
        {pricingTiers.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">수량별 단가 안내</p>
            <div className="flex flex-wrap gap-1.5">
              {[...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity).map((tier, idx) => {
                const isActive = currentTotalQuantity + getTotalQuantity() >= tier.minQuantity;
                return (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded text-xs ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    {tier.minQuantity}벌↑ ₩{tier.pricePerItem.toLocaleString()}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              현재 총 주문량: {currentTotalQuantity}벌 → 내 주문 포함: {currentTotalQuantity + getTotalQuantity()}벌
            </p>
          </div>
        )}
      </div>

      {/* Custom fields */}
      {customFields.filter(f => !f.fixed).map(renderField)}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
          isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isSubmitting ? '처리 중...' : '결제하기'}
      </button>
    </form>
  );
};

export default ParticipantForm;
