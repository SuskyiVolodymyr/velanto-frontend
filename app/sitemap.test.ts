import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sitemap from "./sitemap";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playvelanto.com";

function pack(id: string, authorId: string) {
  return {
    id,
    authorId,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("sitemap", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists static routes plus real pack and de-duplicated user profile URLs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [pack("p1", "u1"), pack("p2", "u1"), pack("p3", "u2")],
        }),
        { status: 200 },
      ),
    );

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}/`); // home
    expect(urls).toContain(`${SITE_URL}/docs`);
    expect(urls).toContain(`${SITE_URL}/feedback`);
    expect(urls).toContain(`${SITE_URL}/packs/p1`);
    expect(urls).toContain(`${SITE_URL}/packs/p3`);
    expect(urls).toContain(`${SITE_URL}/users/u1`);
    expect(urls).toContain(`${SITE_URL}/users/u2`);
    // u1 authored two packs but must appear once.
    expect(urls.filter((u) => u === `${SITE_URL}/users/u1`)).toHaveLength(1);
  });

  it("degrades to static routes when the API is unreachable, without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/docs`);
    expect(urls).toContain(`${SITE_URL}/feedback`);
    // No pack/user routes when the fetch fails.
    expect(urls.some((u) => u.includes("/packs/"))).toBe(false);
    expect(urls.some((u) => u.includes("/users/"))).toBe(false);
  });
});
