import CoBuyPaymentSuccessPageClient from '../../components/CoBuyPaymentSuccessPageClient';

interface CoBuyPaymentSuccessPageProps {
  params: {
    shareToken: string;
  };
}

export default function CoBuyPaymentSuccessPage({ params }: CoBuyPaymentSuccessPageProps) {
  return <CoBuyPaymentSuccessPageClient shareToken={params.shareToken} />;
}
