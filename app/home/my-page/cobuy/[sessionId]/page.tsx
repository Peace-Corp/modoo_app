import CoBuySessionDetailClient from '../CoBuySessionDetailClient';

interface CoBuySessionDetailPageProps {
  params: {
    sessionId: string;
  };
}

export default function CoBuySessionDetailPage({ params }: CoBuySessionDetailPageProps) {
  return <CoBuySessionDetailClient sessionId={params.sessionId} />;
}
