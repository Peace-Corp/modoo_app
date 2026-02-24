import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    if (!shareToken) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: request, error } = await supabase
      .from('cobuy_requests')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (error || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Fetch product info separately
    const { data: product } = await supabase
      .from('products')
      .select('id, title, thumbnail_image_link, configuration, size_options')
      .eq('id', request.product_id)
      .single();

    return NextResponse.json({ ...request, product: product || null });
  } catch (error) {
    console.error('Error fetching CoBuy request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
