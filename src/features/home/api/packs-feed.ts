import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack, PackFormat, PackTag } from "@/src/shared/types/pack";
import type { WindowFilterValue } from "@/src/features/home/filter-options";

// Backend caps `limit` at 50, and there's no pagination UI yet, so the feed
// requests a single page of that size.
export const PACKS_FEED_PAGE_SIZE = 50;

/**
 * The home feed's request shape, already resolved from the UI filter state
 * (the "all" format sentinel → undefined, empty search → undefined, etc.). Also
 * serves as the query key, so its values fully determine a cache entry.
 */
export interface PacksFeedFilters {
  format?: PackFormat;
  tags: PackTag[];
  q?: string;
  sort?: "popular";
  /** Popularity window; only meaningful when `sort` is "popular". */
  window?: WindowFilterValue;
}

export async function getPacksFeed(filters: PacksFeedFilters): Promise<Pack[]> {
  const result = await packsClient.list({
    format: filters.format,
    tags: filters.tags,
    q: filters.q,
    limit: PACKS_FEED_PAGE_SIZE,
    sort: filters.sort,
    window: filters.window,
  });
  return result.items;
}
