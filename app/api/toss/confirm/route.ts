import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const widgetSecretKey = process.env.TOSS_SECRET_KEY;

// Type definitions for request body
interface OrderData {
  id: string;
  name: string;
  email: string;
  phone_num: string;
  address: string | null;
  country_code: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_method: 'domestic' | 'international' | 'pickup';
  delivery_fee: number;
  total_amount: number;
}

interface CartItem {
  id: string;
  product_id: string;
  saved_design_id?: string;
  product_title: string;
  product_color: string;
  product_color_name: string;
  size_id: string;
  size_name: string;
  quantity: number;
  price_per_item: number;
  thumbnail_url?: string;
  canvasState?: Record<string, unknown>;
}

interface PaymentRequestBody {
  orderId: string;
  amount: number;
  paymentKey: string;
  orderData: OrderData;
  cartItems: CartItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PaymentRequestBody;
    const { orderId, amount, paymentKey, orderData, cartItems } = body;

    // Validate required fields
    if (!orderId || !amount || !paymentKey) {
      return NextResponse.json(
        { success: false, error: '필수 결제 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (!orderData || !cartItems) {
      return NextResponse.json(
        { success: false, error: '주문 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Confirm payment with Toss Payments API
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${widgetSecretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        amount,
        paymentKey,
      }),
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss payment confirmation failed:', tossData);
      return NextResponse.json(
        {
          success: false,
          error: tossData.message || '결제 확인에 실패했습니다.',
          code: tossData.code,
        },
        { status: tossResponse.status }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get current user (optional - for guest checkout support)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert order into database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderData.id,
        user_id: user?.id || null,
        customer_name: orderData.name,
        customer_email: orderData.email,
        customer_phone: orderData.phone_num,
        shipping_method: orderData.shipping_method,
        country_code: orderData.country_code,
        state: orderData.state,
        city: orderData.city,
        postal_code: orderData.postal_code,
        address_line_1: orderData.address_line_1,
        address_line_2: orderData.address_line_2,
        delivery_fee: orderData.delivery_fee,
        total_amount: orderData.total_amount,
        payment_method: 'toss',
        payment_key: paymentKey,
        payment_status: 'completed',
        order_status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      // TODO: Handle payment refund if order creation fails
      return NextResponse.json(
        { success: false, error: '주문 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Group cart items by design_id to combine different options into single order items
    const groupedItems = new Map<string, {
      product_id: string;
      product_title: string;
      design_id: string | null;
      canvas_state: Record<string, unknown>;
      thumbnail_url: string | null;
      price_per_item: number;
      variants: Array<{
        size_id: string;
        size_name: string;
        color_id: string;
        color_name: string;
        color_hex: string;
        quantity: number;
      }>;
    }>();

    // Group items by design_id (or product_id if no design)
    for (const item of cartItems) {
      const groupKey = item.saved_design_id || `no-design-${item.product_id}`;

      if (groupedItems.has(groupKey)) {
        // Add variant to existing group
        const group = groupedItems.get(groupKey)!;
        group.variants.push({
          size_id: item.size_id,
          size_name: item.size_name,
          color_id: item.product_color,
          color_name: item.product_color_name,
          color_hex: item.product_color,
          quantity: item.quantity,
        });
      } else {
        // Create new group
        groupedItems.set(groupKey, {
          product_id: item.product_id,
          product_title: item.product_title,
          design_id: item.saved_design_id || null,
          canvas_state: item.canvasState || {},
          thumbnail_url: item.thumbnail_url || null,
          price_per_item: item.price_per_item,
          variants: [{
            size_id: item.size_id,
            size_name: item.size_name,
            color_id: item.product_color,
            color_name: item.product_color_name,
            color_hex: item.product_color,
            quantity: item.quantity,
          }],
        });
      }
    }

    // Convert grouped items to order items format
    const orderItems = Array.from(groupedItems.values()).map((group) => {
      // Calculate total quantity across all variants
      const totalQuantity = group.variants.reduce((sum, variant) => sum + variant.quantity, 0);

      return {
        order_id: order.id,
        product_id: group.product_id,
        product_title: group.product_title,
        quantity: totalQuantity,
        price_per_item: group.price_per_item,
        design_id: group.design_id,
        product_variant_id: null, // For future variant support
        canvas_state: group.canvas_state,
        color_selections: {}, // TODO: Get from saved_design if needed
        item_options: {
          variants: group.variants,
        },
        thumbnail_url: group.thumbnail_url,
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      // Order was created but items failed - log for manual reconciliation
      return NextResponse.json(
        {
          success: false,
          error: '주문 상품 정보 저장에 실패했습니다.',
          orderId: order.id
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentData: tossData,
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
