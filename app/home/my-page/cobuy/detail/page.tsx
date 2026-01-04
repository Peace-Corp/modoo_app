'use client';

import { useSearchParams } from 'next/navigation';
import CoBuySessionDetailClient from '../CoBuySessionDetailClient';

export default function CoBuySessionDetailMobilePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';

  return <CoBuySessionDetailClient sessionId={sessionId} />;
}
