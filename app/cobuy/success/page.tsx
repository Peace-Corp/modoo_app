'use client';

import { useSearchParams } from 'next/navigation';
import CoBuyPaymentSuccessPageClient from '../components/CoBuyPaymentSuccessPageClient';

export default function CoBuyPaymentSuccessMobilePage() {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('shareToken') || '';

  return <CoBuyPaymentSuccessPageClient shareToken={shareToken} />;
}
