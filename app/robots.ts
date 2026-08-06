import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/shared/lib/site-url";

/**
 * Crawlers are allowed only on routes that do NOT query the database.
 *
 * The database is Neon on the free plan, which bills wall-clock time the
 * compute is AWAKE (not queries) and suspends only after 5 minutes without
 * one. A crawler walking pack and profile pages therefore does not just cost
 * queries — it holds the compute open around the clock, which was consuming
 * most of the 100 CU-hour monthly quota. Exceeding that quota suspends the
 * database until the next billing period, i.e. a site outage.
 *
 * Caching those routes would NOT have fixed it. Each page revalidates
 * independently, so a crawl spread across many URLs produces a steady dribble
 * of backend hits, and any URL fetched continuously with a TTL under 5 minutes
 * pins the compute awake permanently regardless of caching. Not crawling them
 * is the only thing that actually creates the silent gaps.
 *
 * Allowed below: the landing page (one DB read per cache window, see
 * get-home-feed-server) plus the genuinely static content pages, which render
 * from message catalogs and touch no backend at all. Verified layer by layer —
 * the root layout only reads a locale cookie, the app shell is client-side, and
 * although AuthProvider fires POST /auth/refresh on every page load including
 * anonymous ones, that endpoint verifies the JWT signature BEFORE any query and
 * 401s a cookieless request without touching Postgres.
 *
 * ⚠ If that ordering in the backend's AuthService.refresh ever changes, every
 * page on this site becomes a DB-waking route and these allowances stop being
 * free.
 *
 * Reversible in one file: re-enable crawling when the site moves to a paid plan
 * (where scale-to-zero can simply be turned off) or when search discovery
 * matters more than the quota. Sharing a link is unaffected either way —
 * robots.txt governs crawlers, not people clicking URLs.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/$", // the landing page only — "/" alone would allow everything
        "/docs",
        "/terms",
        "/privacy",
        "/updates",
      ],
      disallow: [
        // Each of these hits the database on every request.
        "/packs/",
        "/users/",
        "/rules",
        "/auth",
        // Signed-in surfaces: no crawl value, and most still cost a backend
        // round trip to render.
        "/my-packs",
        "/create",
        "/account",
        "/settings",
        "/profile",
        "/notifications",
        "/moderation",
        "/admin",
        "/rooms/",
        "/people",
        "/feedback",
        // The design lab (src/features/design-lab): real screens fed mock
        // state, for working on a layout without a backend. It costs no query,
        // but it is internal tooling showing fabricated content — indexing it
        // would put fake rooms and invented players in search results.
        "/design/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
