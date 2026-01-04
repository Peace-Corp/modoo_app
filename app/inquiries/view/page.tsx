'use client';

import { useSearchParams } from 'next/navigation';
import InquiryDetailClient from '../InquiryDetailClient';

export default function InquiryDetailMobilePage() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get('id') || '';

  return <InquiryDetailClient inquiryId={inquiryId} />;
}
