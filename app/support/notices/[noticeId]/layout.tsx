import type { Metadata } from "next";
import { createAnonClient } from "@/lib/supabase";
import { stripHtmlForMeta } from "@/lib/seo-text";

type Props = {
  children: React.ReactNode;
  params: Promise<{ noticeId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { noticeId } = await params;
  const supabase = createAnonClient();

  const { data } = await supabase
    .from("announcements")
    .select("title, content")
    .eq("id", noticeId)
    .eq("is_published", true)
    .maybeSingle();

  if (!data?.title) {
    return { title: { absolute: "공지사항 | 모두의 유니폼" } };
  }

  const rawDesc = stripHtmlForMeta(data.content || "") || data.title;
  const title = `${data.title} · 공지 | 모두의 유니폼`;

  return {
    title: { absolute: title },
    description: rawDesc,
    openGraph: {
      title,
      description: rawDesc,
      url: `/support/notices/${noticeId}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description: rawDesc,
    },
    alternates: { canonical: `/support/notices/${noticeId}` },
  };
}

export default function NoticeDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
