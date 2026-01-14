'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/store/useAuthStore';
import { ChevronLeft, Package, MapPin, CreditCard, Truck } from 'lucide-react';
import { OrderItem } from '@/types/types';

interface OrderDetail {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_method: 'domestic' | 'international' | 'pickup';
  country_code: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  delivery_fee: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

const orderStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '준비중', className: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '처리중', className: 'bg-blue-100 text-blue-800' },
  shipped: { label: '배송중', className: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: '배송완료', className: 'bg-green-100 text-green-800' },
  completed: { label: '완료', className: 'bg-green-100 text-green-800' },
  cancelled: { label: '취소', className: 'bg-red-100 text-red-800' },
};

const paymentStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '결제 대기', className: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '결제 완료', className: 'bg-green-100 text-green-800' },
  failed: { label: '결제 실패', className: 'bg-red-100 text-red-800' },
  refunded: { label: '환불됨', className: 'bg-gray-100 text-gray-800' },
};

const shippingMethodMap: Record<string, string> = {
  domestic: '국내 배송',
  international: '해외 배송',
  pickup: '직접 수령',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { isAuthenticated, user } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      const userId = supabaseUser?.id || user?.id;

      if (!userId) {
        setError('로그인이 필요합니다.');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch order:', fetchError);
        setError('주문 정보를 불러오는데 실패했습니다.');
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('주문을 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      setOrder(data as OrderDetail);
      setIsLoading(false);
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, user?.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition mr-2"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold">주문 상세</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">로그인이 필요합니다</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-gray-500 mt-4">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition mr-2"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold">주문 상세</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-red-500 mb-4">{error || '주문을 찾을 수 없습니다.'}</p>
            <button
              onClick={() => router.push('/home/my-page/orders')}
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              주문 내역으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orderStatus = orderStatusMap[order.order_status?.toLowerCase()] || orderStatusMap.pending;
  const paymentStatus = paymentStatusMap[order.payment_status?.toLowerCase()] || paymentStatusMap.pending;
  const subtotal = order.total_amount - order.delivery_fee;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition mr-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold">주문 상세</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">주문번호</p>
              <p className="text-sm font-medium text-gray-900">{order.id}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${orderStatus.className}`}>
              {orderStatus.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>주문일시</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            주문 상품
          </h2>
          <div className="space-y-4">
            {order.order_items.map((item) => {
              const variants = item.item_options?.variants || [];
              const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0) || item.quantity;

              return (
                <div key={item.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.product_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          없음
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.product_title}</h3>
                      {item.design_title && (
                        <p className="text-sm text-gray-500 mt-0.5">디자인: {item.design_title}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {formatPrice(item.price_per_item)}원 x {totalQuantity}개
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {formatPrice(item.price_per_item * totalQuantity)}원
                      </p>
                    </div>
                  </div>

                  {/* Variants */}
                  {variants.length > 0 && (
                    <div className="mt-3 pl-23 space-y-1">
                      {variants.map((variant, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <div
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                          <span>{variant.color_name}</span>
                          <span>/</span>
                          <span>{variant.size_name}</span>
                          <span className="text-gray-400">x {variant.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            배송 정보
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">배송 방법</span>
              <span className="text-gray-900">{shippingMethodMap[order.shipping_method] || order.shipping_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">받는 분</span>
              <span className="text-gray-900">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">연락처</span>
              <span className="text-gray-900">{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">이메일</span>
              <span className="text-gray-900">{order.customer_email}</span>
            </div>
            {order.shipping_method !== 'pickup' && order.address_line_1 && (
              <div className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0">배송지</span>
                <div className="text-right text-gray-900">
                  {order.postal_code && <span className="text-gray-500">[{order.postal_code}] </span>}
                  {order.address_line_1}
                  {order.address_line_2 && <span> {order.address_line_2}</span>}
                  {(order.city || order.state) && (
                    <span className="block text-gray-500 text-xs mt-0.5">
                      {[order.city, order.state, order.country_code].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            결제 정보
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">결제 상태</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${paymentStatus.className}`}>
                {paymentStatus.label}
              </span>
            </div>
            {order.payment_method && (
              <div className="flex justify-between">
                <span className="text-gray-500">결제 수단</span>
                <span className="text-gray-900">{order.payment_method}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">상품 금액</span>
                <span className="text-gray-900">{formatPrice(subtotal)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">배송비</span>
                <span className="text-gray-900">
                  {order.delivery_fee > 0 ? `${formatPrice(order.delivery_fee)}원` : '무료'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>총 결제 금액</span>
                <span className="text-blue-600">{formatPrice(order.total_amount)}원</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/inquiries/new')}
            className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            문의하기
          </button>
        </div>
      </div>
    </div>
  );
}
