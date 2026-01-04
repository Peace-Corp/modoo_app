import { isNative } from '@/lib/platform';

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(path: string, params: Record<string, QueryValue>) {
  const entries = Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (entries.length === 0) {
    return path;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    searchParams.set(key, String(value));
  }

  return `${path}?${searchParams.toString()}`;
}

export const routes = {
  home() {
    return isNative() ? '/' : '/home';
  },
  search(category?: string) {
    return buildQuery('/home/search', { category });
  },
  designs() {
    return '/home/designs';
  },
  myPage() {
    return '/home/my-page';
  },
  product(productId: string) {
    return isNative()
      ? buildQuery('/product', { product_id: productId })
      : `/product/${productId}`;
  },
  editor(productId: string) {
    return isNative()
      ? buildQuery('/editor', { productId })
      : `/editor/${productId}`;
  },
  reviews(productId: string) {
    return isNative()
      ? buildQuery('/reviews', { productId })
      : `/reviews/${productId}`;
  },
  inquiryDetail(inquiryId: string) {
    return isNative()
      ? buildQuery('/inquiries/view', { id: inquiryId })
      : `/inquiries/${inquiryId}`;
  },
  cobuyShare(shareToken: string) {
    return isNative()
      ? buildQuery('/cobuy', { shareToken })
      : `/cobuy/${shareToken}`;
  },
  cobuyShareSuccess(shareToken: string) {
    return isNative()
      ? buildQuery('/cobuy/success', { shareToken })
      : `/cobuy/${shareToken}/success`;
  },
  cobuyShareFail(shareToken: string) {
    return isNative()
      ? buildQuery('/cobuy/fail', { shareToken })
      : `/cobuy/${shareToken}/fail`;
  },
  cobuyCheckout(sessionId: string) {
    return isNative()
      ? buildQuery('/cobuy/checkout', { sessionId })
      : `/cobuy/checkout/${sessionId}`;
  },
  cobuyMyPageDetail(sessionId: string) {
    return isNative()
      ? buildQuery('/home/my-page/cobuy/detail', { sessionId })
      : `/home/my-page/cobuy/${sessionId}`;
  },
};
