import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getHomeFeedServer } from "./get-home-feed-server";

describe("getHomeFeedServer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * The revalidate window is load-bearing, not a taste call.
   *
   * `/` is the only database-backed route crawlers are still allowed on (see
   * app/robots.ts), and Neon's compute suspends only after 5 minutes with no
   * query. Any TTL below ~300s on a continuously-crawled URL therefore means a
   * fresh query before the compute can ever sleep — it would hold the database
   * awake permanently by itself and undo the entire robots change. This test
   * exists so that lowering it is a deliberate act.
   */
  it("caches long enough that a crawled landing page cannot pin the database awake", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      );

    await getHomeFeedServer();

    const [, init] = fetchMock.mock.calls[0];
    const revalidate = (init as { next?: { revalidate?: number } })?.next
      ?.revalidate;

    expect(revalidate).toBeGreaterThan(300);
    expect(init).toMatchObject({ next: { revalidate: 21600 } });
  });

  it("never uses no-store, which would query on every single page view", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      );

    await getHomeFeedServer();

    const [, init] = fetchMock.mock.calls[0];
    expect((init as { cache?: string })?.cache).toBeUndefined();
  });

  it("returns null rather than throwing when the backend is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(getHomeFeedServer()).resolves.toBeNull();
  });
});
