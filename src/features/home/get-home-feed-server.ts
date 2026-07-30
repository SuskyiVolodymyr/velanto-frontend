import type { PacksFeedResult } from "@/src/features/home/api/packs-feed";
import { PACKS_FEED_PAGE_SIZE } from "@/src/features/home/api/packs-feed";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors HomeFeed's default (unfiltered) view: approved packs, Popular / this
// month, first page. Must stay in sync with useHomeFeed's default sort/window
// and PACKS_FEED_PAGE_SIZE, or the client refetches instead of using this seed.
const DEFAULT_FEED_QUERY = `page=1&limit=${PACKS_FEED_PAGE_SIZE}&sort=popular&window=month`;

/**
 * Server Component-only fetch of the default public feed, used to seed
 * HomeFeed's first render so the landing page ships indexable pack content
 * instead of an empty "Loading…" shell. Anonymous `GET /packs` returns approved
 * packs only. Returns null on any failure so the caller can fall back to the
 * client-only fetch path rather than crash the home route at build/request time.
 */
export async function getHomeFeedServer(): Promise<PacksFeedResult | null> {
  try {
    // Six hours, and the exact number is load-bearing rather than a taste call.
    //
    // `/` is the one database-backed route crawlers are still allowed on (see
    // app/robots.ts), and Neon's compute suspends only after 5 minutes with no
    // query. So any TTL under ~5 minutes on a continuously-crawled URL means a
    // fresh query before the compute can ever sleep — it would hold the
    // database awake permanently on its own and undo the whole robots change.
    // The previous 60s did exactly that.
    //
    // At 6h this costs ~4 wakes/day. What makes that staleness acceptable is
    // a property of the CLIENT, not of this number: the seed is handed to
    // React Query pre-dated as stale, so a real browser replaces it on
    // hydration and the cached copy is only ever the first paint and what
    // crawlers see (see SSR_SEED_UPDATED_AT in packs-feed.queries.ts).
    //
    // That coupling is load-bearing and easy to break from the other side.
    // Dating the seed as fresh — which is what React Query does by default —
    // silently converts this TTL into up-to-6h staleness for real visitors,
    // with no failing test on this file to show for it. HomeFeed.test.tsx
    // pins the refetch for that reason.
    const res = await fetch(`${API_BASE_URL}/packs?${DEFAULT_FEED_QUERY}`, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: PacksFeedResult["items"];
      total?: number;
    };
    return { items: data.items ?? [], total: data.total ?? 0 };
  } catch {
    return null;
  }
}
