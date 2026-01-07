import { NextResponse } from 'next/server';
import { createClient as createAuthedClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createAuthedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const paths: unknown = body?.paths;

  if (!Array.isArray(paths) || paths.some((p) => typeof p !== 'string')) {
    return NextResponse.json({ error: 'Invalid paths' }, { status: 400 });
  }

  const allowed = paths.every((p) => p.startsWith(`${user.id}/`));
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from('review-images').remove(paths);

  if (error) {
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

