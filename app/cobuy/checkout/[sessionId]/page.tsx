'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import { useAuthStore } from '@/store/useAuthStore';
import { getCoBuySession, getParticipants } from '@/lib/cobuyService';
import { CoBuyParticipant, CoBuySession } from '@/types/types';
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

  const [session, setSession] = useState<CoBuySession | null>(null);
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

        // Check if session is already finalized
        if (sessionData.status === 'finalized') {
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
    if (user && useProfileInfo) {
      setCustomerInfo({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
      });
    }
  }, [user, useProfileInfo]);

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

  const designSnapshot = session?.saved_design_screenshots as unknown as { price_per_item: number } | undefined;
  const pricePerItem = designSnapshot?.price_per_item || 0;
  const subtotal = totalQuantity * pricePerItem;

  const deliveryFee = useMemo(() => {
    if (shippingMethod === 'domestic') return 3000;
    if (shippingMethod === 'international') return 15000;
    return 0; // pickup
  }, [shippingMethod]);

  const totalAmount = subtotal + deliveryFee;

  // Generate order ID and name
  const { orderId, orderName } = useMemo(() => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const id = `COBUY-${timestamp}-${randomStr}`;
    const name = `공동구매: ${session?.title || '주문'}`;

    return { orderId: id, orderName: name };
  }, [session?.title]);

  const handleTestModeCheckout = async () => {
    if (!validateForm()) return;

    const orderData = {
      id: orderId,
      name: customerInfo.name,
      email: customerInfo.email,
      phone_num: customerInfo.phone,
      shipping_method: shippingMethod,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
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
      if (!domesticAddress.roadAddress || !domesticAddress.postalCode) {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="text-gray-500 mt-4">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !session || participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header back />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">공동구매 주문 생성</h1>

        {/* Order Summary */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 요약</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">공동구매 제목</span>
              <span className="font-medium">{session.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">총 참여 인원</span>
              <span className="font-medium">{totalQuantity}명</span>
            </div>
            {aggregatedVariants.map((variant, idx) => (
              <div key={idx} className="flex justify-between text-sm pl-4">
                <span className="text-gray-500">사이즈 {variant.size}</span>
                <span className="text-gray-700">{variant.quantity}개</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-3 border-t">
              <span className="text-gray-600">개당 가격</span>
              <span className="font-medium">{pricePerItem.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">상품 금액</span>
              <span className="font-medium">{subtotal.toLocaleString()}원</span>
            </div>
          </div>
        </section>

        {/* Customer Info */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">주문자 정보</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="useProfileInfo"
                checked={useProfileInfo}
                onChange={(e) => setUseProfileInfo(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useProfileInfo" className="text-sm text-gray-700">
                프로필 정보 사용
              </label>
            </div>
            <input
              type="text"
              placeholder="이름"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="email"
              placeholder="이메일"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="tel"
              placeholder="전화번호"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </section>

        {/* Shipping Method */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">배송 방법</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="shipping"
                value="domestic"
                checked={shippingMethod === 'domestic'}
                onChange={() => setShippingMethod('domestic')}
              />
              <div className="flex-1">
                <div className="font-medium">국내 배송</div>
                <div className="text-sm text-gray-500">3,000원</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="shipping"
                value="international"
                checked={shippingMethod === 'international'}
                onChange={() => setShippingMethod('international')}
              />
              <div className="flex-1">
                <div className="font-medium">해외 배송</div>
                <div className="text-sm text-gray-500">15,000원</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="shipping"
                value="pickup"
                checked={shippingMethod === 'pickup'}
                onChange={() => setShippingMethod('pickup')}
              />
              <div className="flex-1">
                <div className="font-medium">직접 픽업</div>
                <div className="text-sm text-gray-500">무료</div>
              </div>
            </label>
          </div>
        </section>

        {/* Address */}
        {shippingMethod !== 'pickup' && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">배송지 정보</h2>
            {shippingMethod === 'domestic' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="도로명 주소"
                  value={domesticAddress.roadAddress}
                  onChange={(e) =>
                    setDomesticAddress({ ...domesticAddress, roadAddress: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="상세 주소"
                  value={domesticAddress.detailAddress}
                  onChange={(e) =>
                    setDomesticAddress({ ...domesticAddress, detailAddress: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="우편번호"
                  value={domesticAddress.postalCode}
                  onChange={(e) =>
                    setDomesticAddress({ ...domesticAddress, postalCode: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Country"
                  value={internationalAddress.country}
                  onChange={(e) =>
                    setInternationalAddress({ ...internationalAddress, country: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="State/Province"
                  value={internationalAddress.state}
                  onChange={(e) =>
                    setInternationalAddress({ ...internationalAddress, state: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={internationalAddress.city}
                  onChange={(e) =>
                    setInternationalAddress({ ...internationalAddress, city: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={internationalAddress.addressLine1}
                  onChange={(e) =>
                    setInternationalAddress({ ...internationalAddress, addressLine1: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Address Line 2 (Optional)"
                  value={internationalAddress.addressLine2}
                  onChange={(e) =>
                    setInternationalAddress({ ...internationalAddress, addressLine2: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={internationalAddress.postalCode}
                  onChange={(e) =>
                    setInternationalAddress({ ...internationalAddress, postalCode: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}
          </section>
        )}

        {/* Payment Summary */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">결제 금액</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">상품 금액</span>
              <span>{subtotal.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">배송비</span>
              <span>{deliveryFee.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t">
              <span>총 결제 금액</span>
              <span className="text-blue-600">{totalAmount.toLocaleString()}원</span>
            </div>
          </div>
        </section>

        {/* Payment Widget */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">결제 수단</h2>
          {process.env.NEXT_PUBLIC_TESTMODE === 'true' ? (
            <button
              onClick={handleTestModeCheckout}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              테스트 모드로 주문하기
            </button>
          ) : (
            <TossPaymentWidget
              amount={totalAmount}
              orderId={orderId}
              orderName={orderName}
              customerName={customerInfo.name}
              customerEmail={customerInfo.email}
              onBeforePayment={() => validateForm()}
              metadata={{
                sessionId,
                orderData: {
                  id: orderId,
                  name: customerInfo.name,
                  email: customerInfo.email,
                  phone_num: customerInfo.phone,
                  shipping_method: shippingMethod,
                  delivery_fee: deliveryFee,
                  total_amount: totalAmount,
                  ...(shippingMethod === 'domestic' && {
                    address_line_1: domesticAddress.roadAddress,
                    address_line_2: domesticAddress.detailAddress,
                    postal_code: domesticAddress.postalCode,
                    country_code: 'KR',
                  }),
                  ...(shippingMethod === 'international' && {
                    country_code: internationalAddress.country,
                    state: internationalAddress.state,
                    city: internationalAddress.city,
                    postal_code: internationalAddress.postalCode,
                    address_line_1: internationalAddress.addressLine1,
                    address_line_2: internationalAddress.addressLine2,
                  }),
                },
                variants: aggregatedVariants,
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
