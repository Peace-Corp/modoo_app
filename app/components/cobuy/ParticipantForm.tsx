'use client'

import React, { useState } from 'react';
import { CoBuyCustomField } from '@/types/types';

interface ParticipantFormProps {
  customFields: CoBuyCustomField[];
  sizeOptions: string[];
  onSubmit: (data: ParticipantFormData) => void;
  isSubmitting?: boolean;
}

export interface ParticipantFormData {
  name: string;
  email: string;
  phone?: string;
  selectedSize: string;
  fieldResponses: Record<string, string>;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({
  customFields,
  sizeOptions,
  onSubmit,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<ParticipantFormData>({
    name: '',
    email: '',
    phone: '',
    selectedSize: '',
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

    if (!formData.selectedSize) {
      newErrors.selectedSize = '사이즈를 선택해주세요';
    }

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

      {/* Size selector (required) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          사이즈 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.selectedSize}
          onChange={(e) => handleInputChange('selectedSize', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">사이즈를 선택해주세요</option>
          {sizeOptions.map((size, idx) => (
            <option key={idx} value={size}>
              {size}
            </option>
          ))}
        </select>
        {errors.selectedSize && (
          <p className="text-red-500 text-xs mt-1">{errors.selectedSize}</p>
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
