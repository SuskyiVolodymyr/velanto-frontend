/**
 * The site's canonical production origin, used to build absolute URLs for SEO
 * surfaces (metadata, robots.txt, sitemap, JSON-LD). Reads
 * `NEXT_PUBLIC_SITE_URL` and falls back to the production domain, so the domain
 * lives in exactly one place and can't drift between files.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://playvelanto.com";
