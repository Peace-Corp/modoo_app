import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

interface DeleteParticipantBody {
  participantId: string;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as DeleteParticipantBody;
    const { participantId, sessionId } = body;

    if (!participantId || !sessionId) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: participant, error: participantError } = await supabase
      .from('cobuy_participants')
      .select('id, cobuy_session_id, payment_status')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
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

    if (participant.payment_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '결제 상태가 대기 중이 아닙니다.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('cobuy_participants')
      .delete()
      .eq('id', participantId);

    if (deleteError) {
      console.error('Failed to delete CoBuy participant:', deleteError);
      return NextResponse.json(
        { success: false, error: '참여자 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CoBuy participant delete error:', error);
    return NextResponse.json(
      { success: false, error: '참여자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
