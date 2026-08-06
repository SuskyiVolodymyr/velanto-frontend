import { describe, it, expect } from "vitest";
import robots from "./robots";
import { SITE_URL } from "@/src/shared/lib/site-url";

/**
 * This file is the cheapest guard on the single highest-leverage change in the
 * Neon compute work, and the one most likely to be silently reverted by
 * someone adding a route or "fixing" SEO without the context.
 *
 * Every disallowed prefix below queries the database on each request. Because
 * Neon's free-plan compute bills wall-clock awake time and suspends only after
 * 5 minutes without a query, a crawler walking those routes holds it open
 * around the clock — which consumed most of the 100 CU-hour monthly quota.
 * Running out suspends the database until the next billing period.
 *
 * Moving a prefix from disallow to allow is therefore a budget decision, not a
 * metadata tweak. See app/robots.ts for the full reasoning.
 */
describe("robots", () => {
  const rules = robots().rules as {
    userAgent: string;
    allow: string[];
    disallow: string[];
  };

  it("allows only routes that do not touch the database", () => {
    expect(rules.allow).toEqual([
      "/$",
      "/docs",
      "/terms",
      "/privacy",
      "/updates",
    ]);
  });

  // "/" would allow the entire site; "/$" anchors to the landing page alone.
  it("anchors the landing-page allowance so it does not open everything", () => {
    expect(rules.allow).toContain("/$");
    expect(rules.allow).not.toContain("/");
  });

  it("disallows every database-backed route family", () => {
    for (const path of ["/packs/", "/users/", "/rules", "/auth"]) {
      expect(rules.disallow).toContain(path);
    }
  });

  // Not a database concern — the lab renders fabricated rooms and invented
  // players, which have no business in a search result.
  it("keeps the design lab out of the index", () => {
    expect(rules.disallow).toContain("/design/");
  });

  it("still points crawlers at the sitemap", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
