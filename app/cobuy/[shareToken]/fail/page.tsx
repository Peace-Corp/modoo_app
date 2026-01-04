import CoBuyPaymentFailPageClient from '../../components/CoBuyPaymentFailPageClient';

interface CoBuyPaymentFailPageProps {
  params: {
    shareToken: string;
  };
}

export default function CoBuyPaymentFailPage({ params }: CoBuyPaymentFailPageProps) {
  return <CoBuyPaymentFailPageClient shareToken={params.shareToken} />;
}
