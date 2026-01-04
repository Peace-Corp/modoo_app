import CoBuySharePageClient from '../components/CoBuySharePageClient';

interface CoBuySharePageProps {
  params: {
    shareToken: string;
  };
}

export default function CoBuySharePage({ params }: CoBuySharePageProps) {
  return <CoBuySharePageClient shareToken={params.shareToken} />;
}
