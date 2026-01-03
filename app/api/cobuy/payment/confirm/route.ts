import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const widgetSecretKey = process.env.TOSS_SECRET_KEY;

interface PaymentRequestBody {
  orderId: string;
  amount: number;
  paymentKey: string;
  participantId: string;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PaymentRequestBody;
    const { orderId, amount, paymentKey, participantId, sessionId } = body;

    if (!orderId || !amount || !paymentKey || !participantId || !sessionId) {
      return NextResponse.json(
        { success: false, error: '필수 결제 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

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

    const supabase = await createClient();

    const { data: participant, error: participantError } = await supabase
      .from('cobuy_participants')
      .select('id, cobuy_session_id, payment_status')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      console.error('CoBuy participant not found:', participantError);
      return NextResponse.json(
        { success: false, error: '참여자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (participant.cobuy_session_id !== sessionId) {
      return NextResponse.json(
        { success: false, error: '세션 정보가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    if (participant.payment_status === 'completed') {
      return NextResponse.json({ success: true, participantId, sessionId });
    }

    const { error: updateError } = await supabase
      .from('cobuy_participants')
      .update({
        payment_status: 'completed',
        payment_key: paymentKey,
        payment_amount: amount,
        paid_at: new Date().toISOString(),
      })
      .eq('id', participantId);

    if (updateError) {
      console.error('Failed to update CoBuy participant payment:', updateError);
      return NextResponse.json(
        { success: false, error: '결제 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    const { data: session, error: sessionFetchError } = await supabase
      .from('cobuy_sessions')
      .select('current_participant_count')
      .eq('id', sessionId)
      .single();

    if (!sessionFetchError && session) {
      const { error: sessionUpdateError } = await supabase
        .from('cobuy_sessions')
        .update({ current_participant_count: session.current_participant_count + 1 })
        .eq('id', sessionId);

      if (sessionUpdateError) {
        console.error('Failed to increment CoBuy participant count:', sessionUpdateError);
      }
    }

    return NextResponse.json({ success: true, participantId, sessionId });
  } catch (error) {
    console.error('CoBuy payment confirmation error:', error);
    return NextResponse.json(
      { success: false, error: '결제 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
