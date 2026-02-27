import { createAnonClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;

  if (!shareToken) {
    return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
  }

  const supabase = createAnonClient();

  const { data: mall, error } = await supabase
    .from('partner_malls')
    .select(`
      id, name, logo_url, is_active,
      partner_mall_products (
        id, partner_mall_id, product_id,
        display_name, color_hex, color_name, color_code,
        logo_placements, canvas_state, preview_url, price,
        products (
          id, title, base_price, configuration,
          size_options, discount_rates,
          thumbnail_image_link
        )
      )
    `)
    .eq('share_token', shareToken)
    .eq('is_active', true)
    .single();

  if (error || !mall) {
    return NextResponse.json({ error: '찾을 수 없는 페이지입니다.' }, { status: 404 });
  }

  return NextResponse.json({ data: mall });
}
