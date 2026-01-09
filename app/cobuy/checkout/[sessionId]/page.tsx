'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import Header from '@/app/components/Header';
import { useAuthStore } from '@/store/useAuthStore';
import { getCoBuySession, getParticipants } from '@/lib/cobuyService';
import { CoBuyParticipant, CoBuySessionWithDetails } from '@/types/types';
import TossPaymentWidget from '@/app/components/toss/TossPaymentWidget';

type ShippingMethod = 'domestic' | 'international' | 'pickup';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface DomesticAddress {
  roadAddress: string;
  jibunAddress: string;
  detailAddress: string;
  postalCode: string;
}

interface InternationalAddress {
  country: string;
  postalCode: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
}

export default function CoBuyCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [session, setSession] = useState<CoBuySessionWithDetails | null>(null);
  const [participants, setParticipants] = useState<CoBuyParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('domestic');
  const [useProfileInfo, setUseProfileInfo] = useState(true);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
  });

  const [domesticAddress, setDomesticAddress] = useState<DomesticAddress>({
    roadAddress: '',
    jibunAddress: '',
    detailAddress: '',
    postalCode: '',
  });

  const [internationalAddress, setInternationalAddress] = useState<InternationalAddress>({
    country: '',
    postalCode: '',
    state: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
  });

  // Fetch session and participant data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !sessionId) return;

      setIsLoading(true);
      setError(null);

      try {
        const [sessionData, participantData] = await Promise.all([
          getCoBuySession(sessionId, user.id),
          getParticipants(sessionId),
        ]);

        if (!sessionData) {
          setError('공동구매 세션을 찾을 수 없습니다.');
          return;
        }

        // Verify user owns the session
        if (sessionData.user_id !== user.id) {
          setError('권한이 없습니다.');
          return;
        }

        // Check if session is already past order_complete (order already created)
        const orderCreatedStates = ['order_complete', 'manufacturing', 'manufacture_complete', 'delivering', 'delivery_complete'];
        if (orderCreatedStates.includes(sessionData.status)) {
          setError('이미 주문이 생성된 세션입니다.');
          return;
        }

        setSession(sessionData);
        setParticipants(participantData.filter(p => p.payment_status === 'completed'));
      } catch (err) {
        console.error('Error fetching CoBuy data:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sessionId, user]);

  // Auto-fill user profile info
  useEffect(() => {
    if (isAuthenticated && user && useProfileInfo) {
      setCustomerInfo({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    } else if (!useProfileInfo) {
      setCustomerInfo({
        name: '',
        email: '',
        phone: '',
      });
    }
  }, [isAuthenticated, user, useProfileInfo]);

  // Aggregate participant selections into variants
  const aggregatedVariants = useMemo(() => {
    const variantMap = new Map<string, { size: string; quantity: number }>();

    participants.forEach(participant => {
      const size = participant.selected_size;
      const key = size;

      if (variantMap.has(key)) {
        variantMap.get(key)!.quantity += 1;
      } else {
        variantMap.set(key, { size, quantity: 1 });
      }
    });

    return Array.from(variantMap.values());
  }, [participants]);

  const totalQuantity = useMemo(
    () => aggregatedVariants.reduce((sum, v) => sum + v.quantity, 0),
    [aggregatedVariants]
  );

  const designSnapshot = session?.saved_design_screenshot as unknown as {
    price_per_item: number;
    title: string;
    preview_url: string | null;
  } | undefined;
  const pricePerItem = designSnapshot?.price_per_item || 0;
  const totalPrice = totalQuantity * pricePerItem; // For order record only, not charged to creator

  const deliveryFee = useMemo(() => {
    if (shippingMethod === 'domestic') return 3000;
    if (shippingMethod === 'international') return 15000;
    return 0; // pickup
  }, [shippingMethod]);

  // Creator only pays for delivery fee (products already paid by participants)
  const finalTotal = deliveryFee;

  // Generate order ID and name
  const { orderId, orderName } = useMemo(() => {
    const today = new Date;
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear()
    const randomStr = Math.random().toString(36).substring(2, 8);
    const id = `COBUY-${year}${month}${day}-${randomStr}`;
    const name = `공동구매: ${session?.title || '주문'}`;

    return { orderId: id, orderName: name };
  }, [session?.title]);

  // Open Daum Address API
  const handleAddressSearch = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).daum.Postcode({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oncomplete: function(data: any) {
        setDomesticAddress({
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          detailAddress: '',
          postalCode: data.zonecode,
        });
      }
    }).open();
  };

  const handleTestModeCheckout = async () => {
    if (!validateForm()) return;

    const orderData = {
      id: orderId,
      name: customerInfo.name,
      email: customerInfo.email,
      phone_num: customerInfo.phone,
      shipping_method: shippingMethod,
      delivery_fee: deliveryFee,
      total_amount: finalTotal,
      ...(shippingMethod === 'domestic' && {
        address_line_1: domesticAddress.roadAddress,
        address_line_2: domesticAddress.detailAddress,
        postal_code: domesticAddress.postalCode,
        country_code: 'KR',
        city: '',
        state: '',
      }),
      ...(shippingMethod === 'international' && {
        country_code: internationalAddress.country,
        state: internationalAddress.state,
        city: internationalAddress.city,
        postal_code: internationalAddress.postalCode,
        address_line_1: internationalAddress.addressLine1,
        address_line_2: internationalAddress.addressLine2,
      }),
    };

    try {
      const response = await fetch('/api/cobuy/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          orderData,
          variants: aggregatedVariants,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/checkout/success?orderId=${orderId}&testMode=true`);
      } else {
        alert(`주문 생성 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating CoBuy order:', error);
      alert('주문 생성 중 오류가 발생했습니다.');
    }
  };

  const validateForm = (): boolean => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      alert('고객 정보를 모두 입력해주세요.');
      return false;
    }

    if (shippingMethod === 'domestic') {
      if (!domesticAddress.roadAddress || !domesticAddress.detailAddress) {
        alert('배송지 주소를 입력해주세요.');
        return false;
      }
    }

    if (shippingMethod === 'international') {
      if (!internationalAddress.country || !internationalAddress.addressLine1) {
        alert('배송지 주소를 입력해주세요.');
        return false;
      }
    }

    return true;
  };

  // Callback to save order data before payment request
  const handleBeforePaymentRequest = () => {
    if (!validateForm()) {
      throw new Error('Invalid checkout form');
    }

    const orderData = {
      id: orderId,
      name: customerInfo.name,
      email: customerInfo.email,
      phone_num: customerInfo.phone,
      shipping_method: shippingMethod,
      delivery_fee: deliveryFee,
      total_amount: finalTotal,
      country_code: shippingMethod === 'international' ? internationalAddress.country : (shippingMethod === 'domestic' ? 'KR' : null),
      state: shippingMethod === 'international' ? internationalAddress.state : null,
      city: shippingMethod === 'international' ? internationalAddress.city : null,
      postal_code: shippingMethod !== 'pickup'
        ? (shippingMethod === 'domestic' ? domesticAddress.postalCode : internationalAddress.postalCode)
        : null,
      address_line_1: shippingMethod !== 'pickup'
        ? (shippingMethod === 'domestic' ? domesticAddress.roadAddress : internationalAddress.addressLine1)
        : null,
      address_line_2: shippingMethod !== 'pickup'
        ? (shippingMethod === 'domestic' ? domesticAddress.detailAddress : internationalAddress.addressLine2)
        : null,
    };

    // Store in sessionStorage for use in success page
    sessionStorage.setItem('pendingCoBuyOrder', JSON.stringify({
      sessionId,
      orderData,
      variants: aggregatedVariants,
    }));

  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header back />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !session || participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <p className="text-red-500 mb-4">
            {error || '결제 완료된 참여자가 없습니다.'}
          </p>
          <button
            onClick={() => router.push(`/home/my-page/cobuy/${sessionId}`)}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Daum Postcode API */}
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />

      <div className="min-h-screen bg-gray-50 pb-32">
        {/* Header */}
        <div className="sticky top-0 bg-white z-50 border-b border-gray-200">
          <Header back />
        </div>

        {/* Page Title */}
        <div className="bg-white px-4 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-black">공동구매 주문/결제</h1>
          <p className="text-sm text-gray-600 mt-1">공동구매: {session.title}</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white mt-2 p-4">
          <h2 className="font-medium text-black mb-3">주문 상품</h2>
          <div className="flex gap-3 pb-3">
            <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
              {designSnapshot?.preview_url ? (
                <img
                  src={designSnapshot.preview_url}
                  alt={designSnapshot.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-black truncate">
                {designSnapshot?.title || session.title}
              </h3>
              {/* Show all size variants */}
              <div className="mt-1 space-y-0.5">
                {aggregatedVariants.map((variant, idx) => (
                  <p key={idx} className="text-xs text-gray-500">
                    사이즈 {variant.size} - {variant.quantity}개
                  </p>
                ))}
              </div>
              <div className="mt-1">
                <span className="text-xs text-gray-600">총 {totalQuantity}개</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              💡 {participants.length}명의 참여자 결제가 완료되었습니다
            </p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-black">주문자 정보</h2>
            {isAuthenticated && user && (
              <button
                onClick={() => setUseProfileInfo(!useProfileInfo)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {useProfileInfo ? '직접 입력' : '프로필 정보 사용'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                disabled={isAuthenticated && useProfileInfo}
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black ${
                  isAuthenticated && useProfileInfo ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                disabled={isAuthenticated && useProfileInfo}
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black ${
                  isAuthenticated && useProfileInfo ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">휴대폰 번호</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                disabled={isAuthenticated && useProfileInfo}
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black ${
                  isAuthenticated && useProfileInfo ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="010-1234-5678"
              />
            </div>
          </div>
        </div>

        {/* Shipping Method */}
        <div className="bg-white mt-2 p-4">
          <h2 className="font-medium text-black mb-4">배송 방법</h2>
          <div className="space-y-2">
            <button
              onClick={() => setShippingMethod('domestic')}
              className={`w-full p-4 rounded-lg border-2 transition text-left ${
                shippingMethod === 'domestic'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">국내배송</p>
                  <p className="text-xs text-gray-500 mt-1">배송비 3,000원</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  shippingMethod === 'domestic' ? 'border-black' : 'border-gray-300'
                }`}>
                  {shippingMethod === 'domestic' && (
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={() => setShippingMethod('international')}
              className={`w-full p-4 rounded-lg border-2 transition text-left ${
                shippingMethod === 'international'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">해외배송</p>
                  <p className="text-xs text-gray-500 mt-1">배송비 15,000원</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  shippingMethod === 'international' ? 'border-black' : 'border-gray-300'
                }`}>
                  {shippingMethod === 'international' && (
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={() => setShippingMethod('pickup')}
              className={`w-full p-4 rounded-lg border-2 transition text-left ${
                shippingMethod === 'pickup'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">직접 픽업하기</p>
                  <p className="text-xs text-gray-500 mt-1">배송비 무료</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  shippingMethod === 'pickup' ? 'border-black' : 'border-gray-300'
                }`}>
                  {shippingMethod === 'pickup' && (
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Address Input - Domestic */}
        {shippingMethod === 'domestic' && (
          <div className="bg-white mt-2 p-4">
            <h2 className="font-medium text-black mb-4">배송지 정보</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">주소</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domesticAddress.postalCode}
                    readOnly
                    className="w-24 px-4 py-2.5 border border-gray-300 rounded-lg text-black bg-gray-50"
                    placeholder="우편번호"
                  />
                  <button
                    onClick={handleAddressSearch}
                    className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                  >
                    주소 검색
                  </button>
                </div>
              </div>
              {domesticAddress.roadAddress && (
                <>
                  <input
                    type="text"
                    value={domesticAddress.roadAddress}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black bg-gray-50"
                    placeholder="도로명 주소"
                  />
                  <input
                    type="text"
                    value={domesticAddress.jibunAddress}
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black bg-gray-50"
                    placeholder="지번 주소"
                  />
                  <input
                    type="text"
                    value={domesticAddress.detailAddress}
                    onChange={(e) => setDomesticAddress({ ...domesticAddress, detailAddress: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="상세 주소를 입력하세요"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Address Input - International */}
        {shippingMethod === 'international' && (
          <div className="bg-white mt-2 p-4">
            <h2 className="font-medium text-black mb-4">배송지 정보</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={internationalAddress.country}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, country: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter country"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">State/Province</label>
                <input
                  type="text"
                  value={internationalAddress.state}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter state or province"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={internationalAddress.city}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={internationalAddress.postalCode}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, postalCode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter postal code"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={internationalAddress.addressLine1}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, addressLine1: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={internationalAddress.addressLine2}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, addressLine2: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Apt, suite, etc. (optional)"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pickup Information */}
        {shippingMethod === 'pickup' && (
          <div className="bg-white mt-2 p-4">
            <h2 className="font-medium text-black mb-3">픽업 안내</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>픽업 장소:</strong> 서울시 강남구 테헤란로 123
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>운영 시간:</strong> 평일 10:00 - 18:00
              </p>
              <p className="text-sm text-gray-500">
                주문 완료 후 영업일 기준 3-5일 후 픽업 가능합니다.
              </p>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white mt-2 p-4">
          <h2 className="font-medium text-black mb-3">결제 금액</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <p className="text-xs text-blue-700">
              💰 상품 금액은 참여자들이 이미 결제 완료했습니다
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-black">배송비</span>
              <span className="text-xl font-bold text-black">
                {deliveryFee.toLocaleString('ko-KR')}원
              </span>
            </div>
            {deliveryFee === 0 && (
              <p className="text-xs text-gray-500 mt-1">직접 픽업으로 배송비가 무료입니다</p>
            )}
          </div>
        </div>

        {/* Payment Widget */}
        <div className="bg-white mt-2 p-4">
          <h2 className="font-medium text-black mb-4">결제 수단</h2>
          {process.env.NEXT_PUBLIC_TESTMODE === 'true' ? (
            <button
              onClick={handleTestModeCheckout}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              테스트 모드로 주문하기
            </button>
          ) : (
            <TossPaymentWidget
              amount={finalTotal}
              orderId={orderId}
              orderName={orderName}
              customerName={customerInfo.name}
              customerEmail={customerInfo.email}
              successUrl={typeof window !== 'undefined'
                ? `${window.location.origin}/checkout/success`
                : '/checkout/success'}
              failUrl={typeof window !== 'undefined'
                ? `${window.location.origin}/toss/fail`
                : '/toss/fail'}
              onBeforePaymentRequest={handleBeforePaymentRequest}
            />
          )}
        </div>
      </div>
    </>
  );
}
