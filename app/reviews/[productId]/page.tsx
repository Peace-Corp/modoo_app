import ReviewsPageClient from '../ReviewsPageClient';

interface ReviewsPageProps {
  params: {
    productId: string;
  };
}

export default function ReviewsPage({ params }: ReviewsPageProps) {
  return <ReviewsPageClient productId={params.productId} />;
}
