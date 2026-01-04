'use client';

import { useSearchParams } from 'next/navigation';
import CoBuySharePageClient from './components/CoBuySharePageClient';

export default function CoBuyShareMobilePage() {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('shareToken') || '';

  return <CoBuySharePageClient shareToken={shareToken} />;
}
