import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack, PackFormat, PackTag } from "@/src/shared/types/pack";
import type { WindowFilterValue } from "@/src/features/home/filter-options";

// One page of the discovery feed. The backend caps `limit` at 50; 25 keeps each
// page skimmable and gives the pager something to page through.
export const PACKS_FEED_PAGE_SIZE = 25;

/**
 * The home feed's request shape, already resolved from the UI filter state
 * (the "all" format sentinel → undefined, empty search → undefined, etc.). Also
 * serves as the query key, so its values fully determine a cache entry — `page`
 * is part of it so each page caches (and refetches) independently.
 */
export interface PacksFeedFilters {
  format?: PackFormat;
  tags: PackTag[];
  q?: string;
  page?: number;
  /**
   * The backend sort. The UI's "date" sort is already flattened into
   * "newest"/"oldest" here (see useHomeFeed). Omitting it would fall back to the
   * backend's default (relevance) ordering, but the UI always sends one of these
   * now that the Relevance sort option is gone.
   */
  sort?: "popular" | "newest" | "oldest";
  /** Popularity window; only meaningful when `sort` is "popular". */
  window?: WindowFilterValue;
}

/** One page of feed results plus the unpaginated total, for the pager. */
export interface PacksFeedResult {
  items: Pack[];
  total: number;
}

export async function getPacksFeed(
  filters: PacksFeedFilters,
): Promise<PacksFeedResult> {
  const result = await packsClient.list({
    format: filters.format,
    tags: filters.tags,
    q: filters.q,
    // Page 1 is the backend default, so omit it — the default/first-page
    // request then stays byte-identical to the SSR seed and to the pre-pager
    // request. `page` still varies the query key (see PacksFeedFilters), so
    // each page caches separately regardless.
    page: filters.page && filters.page > 1 ? filters.page : undefined,
    limit: PACKS_FEED_PAGE_SIZE,
    sort: filters.sort,
    window: filters.window,
  });
  return { items: result.items, total: result.total };
}
