import type { Metadata } from "next";

const TITLE = "이용약관 · 모두의 유니폼";
const DESC = "모두의 유니폼 서비스 이용약관입니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "/policies",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESC,
  },
  alternates: { canonical: "/policies" },
};

export default function PoliciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
