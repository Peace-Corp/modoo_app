
// Generate static params for static export
export async function generateStaticParams() {
  return []
}

type ProductDetailPageProps = {
  params: Promise<{
    product_id: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { product_id } = await params;

  console.log('Product ID:', product_id);

  return (
    <div>
      <h1>Product ID: {product_id}</h1>
    </div>
  );
}