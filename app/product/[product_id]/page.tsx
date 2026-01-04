
import ProductDetailClient from '../ProductDetailClient';

type ProductDetailPageProps = {
  params: {
    product_id: string;
  };
};

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  return <ProductDetailClient productId={params.product_id} />;
}
