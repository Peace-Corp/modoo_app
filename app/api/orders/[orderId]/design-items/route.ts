import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createHmac } from 'crypto';

function verifyDesignToken(token: string, orderId: string): boolean {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    if (decoded.o !== orderId) return false;
    if (decoded.exp < Date.now()) return false;

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';
    const payload = `design|${decoded.oi}|${decoded.o}|${decoded.exp}`;
    const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
    return expectedSig === decoded.sig;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const supabase = await createClient();
    let authorized = false;

    if (token && verifyDesignToken(token, orderId)) {
      authorized = true;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();
        if (order) authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    const { data: items, error } = await supabase
      .from('order_items')
      .select('id, product_title, design_title, thumbnail_url, design_status, design_shared_at, design_confirmed_at, design_revision_note')
      .eq('order_id', orderId)
      .in('design_status', ['design_shared', 'revision_requested', 'confirmed', 'in_progress'])
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Error fetching design items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
