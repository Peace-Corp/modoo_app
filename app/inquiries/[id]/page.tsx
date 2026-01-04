import InquiryDetailClient from '../InquiryDetailClient';

interface InquiryDetailPageProps {
  params: {
    id: string;
  };
}

export default function InquiryDetailPage({ params }: InquiryDetailPageProps) {
  return <InquiryDetailClient inquiryId={params.id} />;
}
