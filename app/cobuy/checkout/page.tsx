'use client';

import { useSearchParams } from 'next/navigation';
import CoBuyCheckoutPageClient from './CoBuyCheckoutPageClient';

export default function CoBuyCheckoutMobilePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';

  return <CoBuyCheckoutPageClient sessionId={sessionId} />;
}
