
import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-white text-gray-500 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold">Modoo</h3>
            <p className="text-sm text-gray-400 mt-2">
              Custom apparel for everyone.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">고객센터</h3>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li>전화: 070-1234-5678</li>
              <li>이메일: help@modoo.com</li>
              <li>상담시간: 평일 10:00 - 17:00</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">정책</h3>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li><Link href="/policies" className="hover:underline">이용약관</Link></li>
              <li><Link href="/policies#privacy" className="hover:underline">개인정보처리방침</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-sm text-gray-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>회사명:</strong> 주식회사 모두</p>
              <p><strong>대표:</strong> 홍길동</p>
              <p><strong>사업자등록번호:</strong> 123-45-67890</p>
              <p><strong>통신판매업신고:</strong> 제2024-서울강남-12345호</p>
            </div>
            <div>
              <p><strong>주소:</strong> 서울특별시 강남구 테헤란로 123, 45층</p>
              <p><strong>개인정보보호책임자:</strong> 김철수 (privacy@modoo.com)</p>
            </div>
          </div>
          <p className="mt-8 text-center text-xs">
            © {new Date().getFullYear()} Modoo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
