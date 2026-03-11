import { createClient } from "@/lib/supabase";
import { Product, PrintMethodRecord } from "@/types/types";
import { notFound } from "next/navigation";
import ProductEditorClient from "./ProductEditorClient";
import ProductEditorClientDesktop from "./ProductEditorClientDesktop";
import { headers } from "next/headers";

interface PageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default async function ProductEditorPage({ params }: PageProps) {
  const { productId } = await params;
  const supabase = await createClient();
  const userAgent = (await headers()).get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  const { data: productData, error } = await supabase
    .from('products')
    .select(`
      *,
      manufacturers (
        name
      )
    `)
    .eq('id', productId)
    .eq('is_active', true)
    .single();

  // Extract manufacturer name from joined data
  const product = productData ? {
    ...productData,
    manufacturer_name: productData.manufacturers?.name ?? null,
  } : null;

  if (error || !product) {
    notFound();
  }

  // Fetch print methods linked to this product
  const { data: printMethodsData } = await supabase
    .from('product_print_methods')
    .select('print_methods(*)')
    .eq('product_id', productId);

  const printMethods: PrintMethodRecord[] = (printMethodsData || [])
    .map((row: any) => row.print_methods)
    .flat()
    .filter((pm: any): pm is PrintMethodRecord => pm !== null && pm?.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return isMobile
    ? <ProductEditorClient product={product as Product} printMethods={printMethods} />
    : <ProductEditorClientDesktop product={product as Product} printMethods={printMethods} />;
}
