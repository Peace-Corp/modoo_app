'use client';

import { useState } from 'react';

interface ContactFormBubbleProps {
  onSubmit: (name: string, email: string, phone: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export default function ContactFormBubble({ onSubmit, disabled, isSubmitting }: ContactFormBubbleProps) {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const handleSubmit = () => {
    const { name, email, phone } = contactForm;
    if (!name.trim() || !phone.trim() || !privacyConsent || disabled || isSubmitting) return;
    onSubmit(name.trim(), email.trim(), phone.trim());
  };

  const isFormValid = contactForm.name.trim() && contactForm.phone.trim() && privacyConsent;

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
        <input
          type="text"
          value={contactForm.name}
          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="홍길동"
          disabled={disabled || isSubmitting}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent bg-white disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
        <input
          type="email"
          value={contactForm.email}
          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
          placeholder="email@example.com"
          disabled={disabled || isSubmitting}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent bg-white disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">연락처 *</label>
        <input
          type="tel"
          value={contactForm.phone}
          onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="010-1234-5678"
          disabled={disabled || isSubmitting}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent bg-white disabled:opacity-50"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={privacyConsent}
          onChange={(e) => setPrivacyConsent(e.target.checked)}
          disabled={disabled || isSubmitting}
          className="w-4 h-4 text-[#3B55A5] border-gray-300 rounded focus:ring-[#3B55A5]"
        />
        <span className="text-xs text-gray-600">개인정보 활용 동의 *</span>
      </label>
      <button
        onClick={handleSubmit}
        disabled={!isFormValid || disabled || isSubmitting}
        className="w-full py-2.5 bg-[#3B55A5] text-white text-sm font-medium rounded-lg hover:bg-[#2D4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '문의 접수 중...' : '문의하기'}
      </button>
    </div>
  );
}
