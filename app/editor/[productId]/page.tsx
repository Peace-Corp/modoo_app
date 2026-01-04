import { createClient } from "@/lib/supabase";
import { Product } from "@/types/types";
import { notFound } from "next/navigation";
import ProductEditorClient from "../components/ProductEditorClient";
import ProductEditorClientDesktop from "../components/ProductEditorClientDesktop";
import { headers } from "next/headers";

interface PageProps {
  params: {
    productId: string;
  };
}

export default async function ProductEditorPage({ params }: PageProps) {
  const { productId } = params;
  const supabase = await createClient();
  const userAgent = (await headers()).get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('is_active', true)
    .single();

  if (error || !product) {
    notFound();
  }

  return isMobile
    ? <ProductEditorClient product={product as Product} />
    : <ProductEditorClientDesktop product={product as Product} />;
}
