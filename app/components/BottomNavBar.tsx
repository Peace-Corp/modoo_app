
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import CartButton from './CartButton';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

export default function BottomNavBar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: '홈',
      href: '/home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'search',
      label: '검색',
      href: '/home/search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'designs',
      label: '나의 디자인',
      href: '/home/designs',
      icon: (
        <PlusCircle />
      ),
    },
    {
      id: 'mypage',
      label: '마이페이지',
      href: '/home/my-page',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  // Helper function to check if a nav item is active
  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="w-full fixed bottom-0 left-0 bg-white border-t border-gray-200 shadow-lg z-50 rounded-t-xl pb-3">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                {item.icon}
              </div>
              {/* <span className="text-xs mt-1 font-medium">{item.label}</span> */}
            </Link>
          ))}

          {/* Cart button using CartButton component */}
          <div
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-gray-600 hover:text-gray-900"
          >
            <CartButton />
          </div>
        </div>
      </div>
    </nav>
  );
}