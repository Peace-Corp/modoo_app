'use client';

import { useSearchParams } from 'next/navigation';
import CoBuyPaymentFailPageClient from '../components/CoBuyPaymentFailPageClient';

export default function CoBuyPaymentFailMobilePage() {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('shareToken') || '';

  return <CoBuyPaymentFailPageClient shareToken={shareToken} />;
}
