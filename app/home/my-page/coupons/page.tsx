'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, ArrowLeft, AlertCircle, Check, Clock, X } from 'lucide-react';
import Header from '@/app/components/Header';
import { useAuthStore } from '@/store/useAuthStore';
import { registerCoupon, getUserCoupons, getCouponDisplayInfo } from '@/lib/couponService';
import { CouponUsage } from '@/types/types';

type TabType = 'register' | 'my-coupons';

export default function CouponsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('my-coupons');
  const [coupons, setCoupons] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCoupons = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const userCoupons = await getUserCoupons();
      setCoupons(userCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCoupons();
    }
  }, [isAuthenticated, fetchCoupons]);

  const handleRegisterCoupon = async () => {
    if (!couponCode.trim()) {
      setMessage({ type: 'error', text: '쿠폰 코드를 입력해주세요.' });
      return;
    }

    setRegistering(true);
    setMessage(null);

    const result = await registerCoupon(couponCode);

    if (result.valid) {
      setMessage({ type: 'success', text: '쿠폰이 등록되었습니다!' });
      setCouponCode('');
      // Refresh coupon list
      await fetchCoupons();
      // Switch to my-coupons tab
      setActiveTab('my-coupons');
    } else {
      setMessage({ type: 'error', text: result.error || '쿠폰 등록에 실패했습니다.' });
    }

    setRegistering(false);
  };

  const getCouponStatus = (usage: CouponUsage): { label: string; color: string; icon: React.ReactNode } => {
    if (usage.used_at) {
      return {
        label: '사용완료',
        color: 'bg-gray-100 text-gray-600',
        icon: <Check className="w-3 h-3" />,
      };
    }
    if (usage.expires_at && new Date(usage.expires_at) < new Date()) {
      return {
        label: '만료',
        color: 'bg-red-100 text-red-600',
        icon: <X className="w-3 h-3" />,
      };
    }
    return {
      label: '사용가능',
      color: 'bg-green-100 text-green-600',
      icon: <Ticket className="w-3 h-3" />,
    };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Ticket className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
        <p className="text-gray-500 mb-4">쿠폰을 확인하려면 로그인해주세요.</p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2 bg-[#3B55A5] text-white rounded-lg font-medium hover:bg-[#2D4280] transition-colors"
        >
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="hidden md:block">
        <Header showHomeNav />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 mr-2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">내 쿠폰</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('my-coupons')}
              className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'my-coupons'
                  ? 'border-[#3B55A5] text-[#3B55A5]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              내 쿠폰
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'register'
                  ? 'border-[#3B55A5] text-[#3B55A5]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              쿠폰 등록
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="p-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">쿠폰 코드 등록</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="쿠폰 코드 입력"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B55A5] focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleRegisterCoupon()}
                />
                <button
                  onClick={handleRegisterCoupon}
                  disabled={registering || !couponCode.trim()}
                  className="px-6 py-2.5 bg-[#3B55A5] text-white rounded-lg font-medium hover:bg-[#2D4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? '등록중...' : '등록'}
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                쿠폰 코드를 입력하고 등록 버튼을 눌러주세요.
              </p>
            </div>
          </div>
        )}

        {/* My Coupons Tab */}
        {activeTab === 'my-coupons' && (
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-[#3B55A5] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">등록된 쿠폰이 없습니다</h3>
                <p className="text-gray-500 mb-4">쿠폰 코드를 등록해 보세요!</p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="px-6 py-2 bg-[#3B55A5] text-white rounded-lg font-medium hover:bg-[#2D4280] transition-colors"
                >
                  쿠폰 등록하기
                </button>
              </div>
            ) : (
              coupons.map((usage) => {
                const coupon = usage.coupon;
                if (!coupon) return null;

                const status = getCouponStatus(usage);
                const displayInfo = getCouponDisplayInfo(coupon);

                return (
                  <div
                    key={usage.id}
                    className={`bg-white rounded-lg overflow-hidden shadow-sm border ${
                      usage.used_at || (usage.expires_at && new Date(usage.expires_at) < new Date())
                        ? 'border-gray-200 opacity-60'
                        : 'border-[#3B55A5]/20'
                    }`}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {coupon.display_name || coupon.code}
                          </h3>
                          {coupon.display_name && (
                            <p className="text-xs font-mono text-gray-400 mt-0.5">{coupon.code}</p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>

                      {/* Discount */}
                      <div className="text-2xl font-bold text-[#3B55A5] mb-2">
                        {displayInfo.discountText}
                      </div>

                      {/* Info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {displayInfo.minOrderText && (
                          <span>{displayInfo.minOrderText}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {usage.expires_at
                            ? `${formatDate(usage.expires_at)}까지`
                            : displayInfo.expiryText}
                        </span>
                      </div>

                      {/* Used info */}
                      {usage.used_at && (
                        <p className="mt-2 text-xs text-gray-400">
                          {formatDate(usage.used_at)} 사용완료
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
