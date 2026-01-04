import CoBuyCheckoutPageClient from '../CoBuyCheckoutPageClient';

interface CoBuyCheckoutPageProps {
  params: {
    sessionId: string;
  };
}

export default function CoBuyCheckoutPage({ params }: CoBuyCheckoutPageProps) {
  return <CoBuyCheckoutPageClient sessionId={params.sessionId} />;
}
