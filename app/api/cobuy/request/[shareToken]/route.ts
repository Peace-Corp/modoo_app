import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';

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

    // Fetch admin design canvas_state if linked (use admin client to bypass RLS)
    let adminDesign = null;
    if (request.admin_design_id) {
      const adminSupabase = createAdminClient();
      const { data: design, error: designError } = await adminSupabase
        .from('saved_designs')
        .select('id, canvas_state, color_selections')
        .eq('id', request.admin_design_id)
        .single();
      if (designError) {
        console.error('[CoBuy API] Failed to fetch saved design:', designError);
      }
      adminDesign = design || null;
      console.log('[CoBuy API] admin_design_id:', request.admin_design_id,
        'found:', !!design,
        'has canvas_state:', !!design?.canvas_state,
        'sides:', design?.canvas_state ? Object.keys(design.canvas_state) : []);
    } else {
      console.log('[CoBuy API] No admin_design_id on request');
    }

    return NextResponse.json({ ...request, product: product || null, admin_design: adminDesign });
  } catch (error) {
    console.error('Error fetching CoBuy request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
