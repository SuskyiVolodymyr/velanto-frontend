import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sitemap from "./sitemap";
import { SITE_URL } from "@/src/shared/lib/site-url";

describe("sitemap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists the crawlable static routes", () => {
    const urls = sitemap().map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/docs`);
    expect(urls).toContain(`${SITE_URL}/updates`);
    expect(urls).toContain(`${SITE_URL}/terms`);
    expect(urls).toContain(`${SITE_URL}/privacy`);
  });

  // Advertising URLs that robots.ts forbids earns a "sitemap contains URLs
  // which are blocked by robots.txt" warning and helps nobody. These route
  // families are disallowed because they query the database per request.
  it("advertises no route that robots.ts disallows", () => {
    const urls = sitemap().map((e) => e.url);

    for (const blocked of [
      "/packs/",
      "/users/",
      "/feedback",
      "/rules",
      "/auth",
    ]) {
      expect(urls.some((u) => u.includes(blocked))).toBe(false);
    }
  });

  // The whole point of dropping the pack/author routes: this route used to be
  // an uncached database query served to crawlers. It must not reacquire one.
  it("makes no network request at all", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    sitemap();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
