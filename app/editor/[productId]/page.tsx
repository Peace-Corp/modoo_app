import { createClient } from "@/lib/supabase";
import { Product } from "@/types/types";
import { notFound } from "next/navigation";
import ProductEditorClient from "./ProductEditorClient";

interface PageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default async function ProductEditorPage({ params }: PageProps) {
  const { productId } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('is_active', true)
    .single();

  if (error || !product) {
    notFound();
  }

  return <ProductEditorClient product={product as Product} />;
}