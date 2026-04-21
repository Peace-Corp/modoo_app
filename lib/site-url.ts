/**
 * Canonical site origin for metadata, sitemap, and Open Graph URLs.
 * Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL in production (e.g. https://modoouniform.com).
 */
export function getSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return new URL(normalized);
}
