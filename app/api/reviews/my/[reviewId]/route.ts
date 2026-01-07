import { NextResponse } from 'next/server';
import { createClient as createAuthedClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';
import { storagePathFromReviewImageUrl } from '@/lib/reviewImages';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params;
  if (!reviewId) {
    return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 });
  }

  const supabase = await createAuthedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: review, error: fetchError } = await admin
    .from('reviews')
    .select('id, user_id, review_image_urls')
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message || 'Failed to fetch review' },
      { status: 500 }
    );
  }
  if (!review) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const urls = Array.isArray(review.review_image_urls) ? review.review_image_urls : [];
  const paths = urls
    .map((url: string) => storagePathFromReviewImageUrl(url))
    .filter((p: string | null): p is string => Boolean(p))
    .filter((p: string) => p.startsWith(`${user.id}/`));

  if (paths.length > 0) {
    const { error: storageError } = await admin.storage
      .from('review-images')
      .remove(paths);

    if (storageError) {
      return NextResponse.json(
        { error: storageError.message || 'Failed to delete images' },
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await admin
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || 'Failed to delete review' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

