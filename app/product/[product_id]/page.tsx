import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/site-url";

type ProductDetailPageProps = {
  params: Promise<{
    product_id: string;
  }>;
};

function ogImageUrl(
  links: string[] | null | undefined,
  base: URL,
): string | undefined {
  const u = links?.[0];
  if (!u) return undefined;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return new URL(path, base).href;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { product_id } = await params;
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("products")
    .select("title, thumbnail_image_link")
    .eq("id", product_id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.title) {
    return { title: { absolute: "상품 | 모두의 유니폼" } };
  }

  const base = getSiteUrl();
  const title = `${data.title} · 모두의 유니폼`;
  const description = `${data.title} — 단체 유니폼·단체복 맞춤 주문 제작`;
  const image = ogImageUrl(
    data.thumbnail_image_link as string[] | null | undefined,
    base,
  );

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url: `/editor/${product_id}`,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    alternates: { canonical: `/editor/${product_id}` },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { product_id } = await params;
  permanentRedirect(`/editor/${product_id}`);
}
