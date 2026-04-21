import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl().origin;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/reset-password",
        "/auth/",
        "/home/my-page/",
        "/cart",
        "/checkout",
        "/payment/",
        "/toss/",
        "/chat",
        "/editor/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
