export function storagePathFromReviewImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const publicPrefix = '/storage/v1/object/public/review-images/';
    const signedPrefix = '/storage/v1/object/sign/review-images/';

    if (pathname.includes(publicPrefix)) {
      return decodeURIComponent(pathname.split(publicPrefix)[1] || '');
    }
    if (pathname.includes(signedPrefix)) {
      return decodeURIComponent(pathname.split(signedPrefix)[1] || '');
    }

    return null;
  } catch {
    return null;
  }
}

