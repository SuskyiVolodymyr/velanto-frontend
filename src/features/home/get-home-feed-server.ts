import type { Pack } from "@/src/shared/types/pack";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors HomeFeed's default (unfiltered) view: approved packs, relevance
// order, one page. Kept in sync with HomeFeed's PAGE_SIZE.
const PAGE_SIZE = 50;

/**
 * Server Component-only fetch of the default public feed, used to seed
 * HomeFeed's first render so the landing page ships indexable pack content
 * instead of an empty "Loading…" shell. Anonymous `GET /packs` returns approved
 * packs only. Returns null on any failure so the caller can fall back to the
 * client-only fetch path rather than crash the home route at build/request time.
 */
export async function getHomeFeedServer(): Promise<Pack[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/packs?limit=${PAGE_SIZE}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: Pack[] };
    return data.items ?? [];
  } catch {
    return null;
  }
}
