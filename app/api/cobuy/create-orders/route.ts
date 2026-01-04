import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import {
  exportAndUploadTextFromCanvasState,
  extractImageUrlsFromCanvasState
} from '@/lib/server-svg-export';

interface CreateCoBuyOrdersRequest {
  sessionId: string;
}

/**
 * API route to create orders for all participants in a CoBuy session
 *
 * This endpoint:
 * 1. Validates the CoBuy session exists and belongs to the authenticated user
 * 2. Retrieves all participants with completed payments
 * 3. Creates individual orders for each participant
 * 4. Marks orders with order_category = 'cobuy'
 * 5. Updates the session status to 'finalized'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateCoBuyOrdersRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId가 필요합니다.' },
        { status: 400 }
      );
    }

    // Fetch CoBuy session with design data
    const { data: session, error: sessionError } = await supabase
      .from('cobuy_sessions')
      .select(`
        id,
        user_id,
        title,
        status,
        saved_design_screenshot_id,
        saved_design_screenshots (
          id,
          product_id,
          title,
          canvas_state,
          color_selections,
          price_per_item,
          preview_url,
          image_urls
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: '공동구매 세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Verify the session belongs to the authenticated user
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Check if session has already been finalized
    if (session.status === 'finalized') {
      return NextResponse.json(
        { success: false, error: '이미 주문이 생성된 세션입니다.' },
        { status: 400 }
      );
    }

    // Fetch all participants with completed payments
    const { data: participants, error: participantsError } = await supabase
      .from('cobuy_participants')
      .select('*')
      .eq('cobuy_session_id', sessionId)
      .eq('payment_status', 'completed')
      .order('joined_at', { ascending: true });

    if (participantsError) {
      return NextResponse.json(
        { success: false, error: '참여자 정보를 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { success: false, error: '결제 완료된 참여자가 없습니다.' },
        { status: 400 }
      );
    }

    const designSnapshot = session.saved_design_screenshots as unknown as {
      id: string;
      product_id: string;
      title: string;
      canvas_state: Record<string, unknown>;
      color_selections: Record<string, unknown>;
      price_per_item: number;
      preview_url: string | null;
      image_urls: Record<string, unknown>;
    };

    if (!designSnapshot) {
      return NextResponse.json(
        { success: false, error: '디자인 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Fetch product information
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, title')
      .eq('id', designSnapshot.product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: '상품 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const createdOrders: string[] = [];
    const failedOrders: Array<{ participantName: string; error: string }> = [];

    // Create an order for each participant
    for (const participant of participants) {
      try {
        const orderId = crypto.randomUUID();

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            id: orderId,
            user_id: null, // CoBuy participants may not have user accounts
            customer_name: participant.name,
            customer_email: participant.email,
            customer_phone: participant.phone,
            shipping_method: 'domestic', // Default shipping method
            total_amount: participant.payment_amount,
            payment_method: 'toss',
            payment_key: participant.payment_key,
            payment_status: 'completed',
            order_status: 'pending',
            order_category: 'cobuy', // Mark as CoBuy order
            delivery_fee: 0, // Included in payment_amount
          })
          .select()
          .single();

        if (orderError) {
          failedOrders.push({
            participantName: participant.name,
            error: orderError.message
          });
          continue;
        }

        // Create order item with participant's selected options
        const { data: orderItem, error: orderItemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: product.id,
            product_title: product.title,
            design_title: designSnapshot.title,
            quantity: 1, // Each participant gets 1 item
            price_per_item: designSnapshot.price_per_item,
            canvas_state: designSnapshot.canvas_state,
            color_selections: designSnapshot.color_selections,
            thumbnail_url: designSnapshot.preview_url,
            image_urls: designSnapshot.image_urls,
            item_options: {
              variants: [{
                size_id: participant.selected_size,
                size_name: participant.selected_size,
                color_id: 'default',
                color_name: '기본',
                color_hex: '#FFFFFF',
                quantity: 1,
              }],
              // Include custom field responses for reference
              custom_fields: participant.field_responses,
            },
          })
          .select()
          .single();

        if (orderItemError) {
          // Attempt to delete the orphaned order
          await supabase.from('orders').delete().eq('id', order.id);
          failedOrders.push({
            participantName: participant.name,
            error: orderItemError.message
          });
          continue;
        }

        // Export text to SVG and extract image URLs
        try {
          if (orderItem.canvas_state && typeof orderItem.canvas_state === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvasStateMap = orderItem.canvas_state as Record<string, any>;

            const svgUrls = await exportAndUploadTextFromCanvasState(
              supabase,
              canvasStateMap,
              orderItem.id
            );

            const imageUrls = extractImageUrlsFromCanvasState(canvasStateMap);

            const hasData = Object.keys(svgUrls).length > 0 || Object.keys(imageUrls).length > 0;

            if (hasData) {
              const updates: { text_svg_exports?: Record<string, string>; image_urls?: Record<string, unknown> } = {};

              if (Object.keys(svgUrls).length > 0) {
                updates.text_svg_exports = svgUrls;
              }

              if (Object.keys(imageUrls).length > 0) {
                updates.image_urls = imageUrls;
              }

              await supabase
                .from('order_items')
                .update(updates)
                .eq('id', orderItem.id);
            }
          }
        } catch (exportError) {
          // Log error but don't fail the order
          console.error(`Failed to export SVG for order ${order.id}:`, exportError);
        }

        createdOrders.push(order.id);
      } catch (error) {
        failedOrders.push({
          participantName: participant.name,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }

    // Update session status to finalized if at least one order was created
    if (createdOrders.length > 0) {
      await supabase
        .from('cobuy_sessions')
        .update({ status: 'finalized' })
        .eq('id', sessionId);
    }

    return NextResponse.json({
      success: true,
      createdOrdersCount: createdOrders.length,
      failedOrdersCount: failedOrders.length,
      createdOrders,
      failedOrders: failedOrders.length > 0 ? failedOrders : undefined,
    });

  } catch (error) {
    console.error('Error creating CoBuy orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
