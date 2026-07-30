import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/shared/lib/site-url";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";

// Public, indexable app routes that always exist regardless of API state.
const STATIC_PATHS = ["/", "/docs", "/updates"] as const;

// Same, but they change about once a year rather than weekly, so they carry a
// lower priority and changeFrequency than the paths above.
const LEGAL_PATHS = ["/terms", "/privacy"] as const;

/**
 * Lists only the routes `robots.ts` actually allows — which is why this file no
 * longer queries the API at all.
 *
 * It used to fetch up to 50 approved packs and derive their authors' profile
 * URLs. Both of those route families are now disallowed to crawlers (they query
 * Neon on every request, and a crawl walking them held the free plan's
 * scale-to-zero compute awake around the clock — see robots.ts for the full
 * reasoning). Advertising URLs that robots.txt forbids would earn a "sitemap
 * contains URLs which are blocked" warning in Search Console and help nobody.
 *
 * Dropping them removes this route's own database round trip as a side effect,
 * which is strictly better than caching it: a crawler-facing sitemap that is
 * itself an uncached query is the worst of both worlds. `/feedback` is gone for
 * the same reason — it is disallowed and backend-backed.
 *
 * If crawling is re-enabled (paid plan, or discovery outweighing the quota),
 * restore the pack/author routes here in the same change that reopens
 * robots.ts, and add caching to the fetch at that point.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));

  // `lastModified` is the real edit date of the documents, not `now` — these
  // change about once a year, and claiming otherwise teaches crawlers to
  // ignore the field.
  const legalRoutes: MetadataRoute.Sitemap = LEGAL_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(LEGAL_LAST_UPDATED),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...staticRoutes, ...legalRoutes];
}
