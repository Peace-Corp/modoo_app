'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Header from '@/app/components/Header';
import {
  getCartItemsWithDesigns,
  type CartItemWithDesign
} from '@/lib/cartService';
import TossPaymentWidget from '../components/toss/TossPaymentWidget';
import { useAuthStore } from '@/store/useAuthStore';

type ShippingMethod = 'domestic' | 'international' | 'pickup';
type PaymentMethod = 'toss' | 'paypal';

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

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<CartItemWithDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('domestic');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('toss');
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

  // Group items by design for display
  const groupedItems = items.reduce<Array<{
    id: string;
    product_id: string;
    saved_design_id?: string;
    product_title: string;
    designName?: string;
    thumbnail_url?: string;
    price_per_item: number;
    variants: Array<{
      product_color: string;
      product_color_name: string;
      size_id: string;
      size_name: string;
      quantity: number;
    }>;
    totalQuantity: number;
  }>>((acc, item) => {
    const groupKey = item.saved_design_id || item.product_id;
    const existingGroup = acc.find(g =>
      (g.saved_design_id && g.saved_design_id === item.saved_design_id) ||
      (!g.saved_design_id && g.product_id === item.product_id)
    );

    if (existingGroup) {
      // Add variant to existing group
      existingGroup.variants.push({
        product_color: item.product_color,
        product_color_name: item.product_color_name,
        size_id: item.size_id,
        size_name: item.size_name,
        quantity: item.quantity,
      });
      existingGroup.totalQuantity += item.quantity;
    } else {
      // Create new group
      acc.push({
        id: groupKey,
        product_id: item.product_id,
        saved_design_id: item.saved_design_id,
        product_title: item.product_title,
        designName: item.designName,
        thumbnail_url: item.thumbnail_url,
        price_per_item: item.price_per_item,
        variants: [{
          product_color: item.product_color,
          product_color_name: item.product_color_name,
          size_id: item.size_id,
          size_name: item.size_name,
          quantity: item.quantity,
        }],
        totalQuantity: item.quantity,
      });
    }

    return acc;
  }, []);

  // Generate unique order ID and order name
  const { orderId, orderName } = useMemo(() => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const id = `ORDER-${timestamp}-${randomStr}`;

    // Create order name from grouped items
    const firstItemName = groupedItems[0]?.designName || groupedItems[0]?.product_title || '주문 상품';
    const name = groupedItems.length > 1
      ? `${firstItemName} 외 ${groupedItems.length - 1}건`
      : firstItemName;

    return { orderId: id, orderName: name };
  }, [groupedItems]);

  // Fetch cart items
  useEffect(() => {
    const fetchCartItems = async () => {
      setIsLoading(true);
      try {
        const cartItems = await getCartItemsWithDesigns();
        if (cartItems.length === 0) {
          router.push('/cart');
          return;
        }
        setItems(cartItems);
      } catch (error) {
        console.error('Error fetching cart items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartItems();
  }, [router]);

  // Auto-fill customer info from user profile when authenticated and useProfileInfo is true
  useEffect(() => {
    if (isAuthenticated && user && useProfileInfo) {
      setCustomerInfo({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    } else if (!useProfileInfo) {
      // Clear fields when switching to manual entry
      setCustomerInfo({
        name: '',
        email: '',
        phone: '',
      });
    }
  }, [isAuthenticated, user, useProfileInfo]);

  // Calculate totals
  const totalPrice = items.reduce((total, item) => total + item.price_per_item * item.quantity, 0);
  const deliveryFee = shippingMethod === 'pickup' ? 0 : shippingMethod === 'domestic' ? 3000 : 5000;
  const finalTotal = totalPrice + deliveryFee;

  // Open Daum Address API
  const handleAddressSearch = () => {
    new (window as any).daum.Postcode({
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

  const handlePayPalPayment = () => {
    // Validate customer info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      alert('고객 정보를 모두 입력해주세요.');
      return;
    }

    // Validate address based on shipping method
    if (shippingMethod === 'domestic') {
      if (!domesticAddress.roadAddress || !domesticAddress.detailAddress) {
        alert('배송 주소를 입력해주세요.');
        return;
      }
    } else if (shippingMethod === 'international') {
      if (!internationalAddress.country || !internationalAddress.city || !internationalAddress.addressLine1) {
        alert('배송 주소를 입력해주세요.');
        return;
      }
    }

    // TODO: Implement PayPal payment logic
    alert('PayPal 결제 기능은 준비 중입니다.');
  };

  // Callback to save order data before payment request
  const handleBeforePaymentRequest = () => {
    // Prepare full address string (legacy field for backward compatibility)
    const fullAddress = shippingMethod !== 'pickup'
      ? shippingMethod === 'domestic'
        ? `[${domesticAddress.postalCode}] ${domesticAddress.roadAddress} ${domesticAddress.detailAddress}`.trim()
        : `${internationalAddress.addressLine1} ${internationalAddress.addressLine2}`.trim()
      : null;

    // Prepare order data to be used after payment confirmation
    const orderData = {
      id: orderId,
      name: customerInfo.name,
      email: customerInfo.email,
      phone_num: customerInfo.phone,
      address: fullAddress,
      country_code: shippingMethod === 'international' ? internationalAddress.country : null,
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
      shipping_method: shippingMethod,
      delivery_fee: deliveryFee,
      total_amount: finalTotal,
    };

    // Store in sessionStorage for use in success page
    sessionStorage.setItem('pendingTossOrder', JSON.stringify({
      orderData,
      cartItems: items
    }));

    console.log('Order data stored for Toss payment:', orderData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header back={true} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
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
          <Header back={true} />
        </div>

      {/* Page Title */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-black">주문/결제</h1>
      </div>

      {/* Order Summary */}
      <div className="bg-white mt-2 p-4">
        <h2 className="font-medium text-black mb-3">주문 상품 ({groupedItems.length})</h2>
        <div className="space-y-3">
          {groupedItems.map((group) => (
            <div key={group.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
              <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                {group.thumbnail_url ? (
                  <img
                    src={group.thumbnail_url}
                    alt={group.product_title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className="w-12 h-12 rounded"
                      style={{ backgroundColor: group.variants[0].product_color }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-black truncate">
                  {group.designName || group.product_title}
                </h3>
                {/* Show all variants */}
                <div className="mt-1 space-y-0.5">
                  {group.variants.map((variant, idx) => (
                    <p key={idx} className="text-xs text-gray-500">
                      {variant.product_color_name} / {variant.size_name} - {variant.quantity}개
                    </p>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-600">총 {group.totalQuantity}개</span>
                  <span className="text-sm font-medium text-black">
                    {(group.price_per_item * group.totalQuantity).toLocaleString('ko-KR')}원
                  </span>
                </div>
              </div>
            </div>
          ))}
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
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value.replace(/[^0-9]/g, '') })}
              disabled={isAuthenticated && useProfileInfo}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black ${
                isAuthenticated && useProfileInfo ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="01012345678"
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
                <p className="text-xs text-gray-500 mt-1">배송비 5,000원</p>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={internationalAddress.postalCode}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, postalCode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="12345"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={internationalAddress.state}
                  onChange={(e) => setInternationalAddress({ ...internationalAddress, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="CA"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={internationalAddress.city}
                onChange={(e) => setInternationalAddress({ ...internationalAddress, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Los Angeles"
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
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">상품 금액</span>
            <span className="text-black">{totalPrice.toLocaleString('ko-KR')}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">배송비</span>
            <span className="text-black">{deliveryFee.toLocaleString('ko-KR')}원</span>
          </div>
          <div className="h-px bg-gray-200 my-3"></div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-black">총 결제금액</span>
            <span className="text-xl font-bold text-black">
              {finalTotal.toLocaleString('ko-KR')}원
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Section */}
      <div className="bg-white mt-2 p-4">
        <h2 className="font-medium text-black mb-4">결제 수단</h2>
        <div className="space-y-2">
          <button
            onClick={() => setPaymentMethod('toss')}
            className={`w-full p-4 rounded-lg border-2 transition text-left ${
              paymentMethod === 'toss'
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  토스
                </div>
                <div>
                  <p className="font-medium text-black">간편결제</p>
                  <p className="text-xs text-gray-500 mt-1">토스페이먼츠로 간편하게 결제</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'toss' ? 'border-black' : 'border-gray-300'
              }`}>
                {paymentMethod === 'toss' && (
                  <div className="w-3 h-3 rounded-full bg-black"></div>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('paypal')}
            className={`w-full p-4 rounded-lg border-2 transition text-left ${
              paymentMethod === 'paypal'
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0070ba] rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  PP
                </div>
                <div>
                  <p className="font-medium text-black">PayPal</p>
                  <p className="text-xs text-gray-500 mt-1">페이팔로 안전하게 결제</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === 'paypal' ? 'border-black' : 'border-gray-300'
              }`}>
                {paymentMethod === 'paypal' && (
                  <div className="w-3 h-3 rounded-full bg-black"></div>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Toss Payment Widget - Only show when Toss is selected */}
      {paymentMethod === 'toss' && (
        <div className='w-full px-4 mt-4'>
          <TossPaymentWidget
            amount={finalTotal}
            orderId={orderId}
            orderName={orderName}
            customerEmail={customerInfo.email}
            customerName={customerInfo.name}
            customerMobilePhone={customerInfo.phone}
            successUrl={typeof window !== 'undefined' ? window.location.origin + "/toss/success" : "/toss/success"}
            failUrl={typeof window !== 'undefined' ? window.location.origin + "/toss/fail" : "/toss/fail"}
            enableCoupon={false}
            onReady={() => console.log("Toss payment widget ready")}
            onError={(error) => {
              console.error("Toss payment error:", error);
              alert(`결제 위젯 오류: ${error.message}`);
            }}
            onBeforePaymentRequest={handleBeforePaymentRequest}
          />
        </div>
      )}

      {/* Bottom Fixed Bar - Only show for PayPal */}
      {paymentMethod === 'paypal' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">총 결제금액</p>
              <p className="text-lg font-bold text-black">
                {finalTotal.toLocaleString('ko-KR')}원
              </p>
            </div>
            <button
              onClick={handlePayPalPayment}
              className="flex-1 max-w-xs px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              결제하기
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}