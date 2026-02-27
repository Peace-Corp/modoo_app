import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    const supabase = await createClient();

    // Get the request by share token
    const { data: request, error: reqError } = await supabase
      .from('cobuy_requests')
      .select('id')
      .eq('share_token', shareToken)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const { data: comments, error } = await supabase
      .from('cobuy_request_comments')
      .select('*')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json(comments || []);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;
    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request by share token
    const { data: request, error: reqError } = await supabase
      .from('cobuy_requests')
      .select('id, user_id, status')
      .eq('share_token', shareToken)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Verify the user owns this request
    if (request.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Insert comment
    const { data: comment, error: commentError } = await supabase
      .from('cobuy_request_comments')
      .insert({
        request_id: request.id,
        user_id: user.id,
        content: content.trim(),
        is_admin: false,
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Auto-update status to 'feedback' if current status is 'design_shared'
    if (request.status === 'design_shared') {
      await supabase
        .from('cobuy_requests')
        .update({ status: 'feedback', updated_at: new Date().toISOString() })
        .eq('id', request.id);
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
