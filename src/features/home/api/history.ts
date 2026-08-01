import { usersClient } from "@/src/shared/lib/users-client";
import type { PackList } from "@/src/shared/lib/packs-client";
import type { PackFormat, RecentlyPlayedPack } from "@/src/shared/types/pack";

/**
 * Which end of the history to page from. Mirrors `RECENTLY_PLAYED_SORTS` in the
 * backend's `dto/list-recently-played.dto.ts` — named for what the user asks
 * for rather than asc/desc, since the ordered column isn't in the response.
 */
export type HistorySort = "recent" | "oldest";

export interface HistoryFilters {
  /** Narrow to one pack format; omitted means every format. */
  format?: PackFormat;
  sort: HistorySort;
  page: number;
}

/**
 * One page of the signed-in user's play history — the same
 * `/users/:id/recently-played` endpoint the profile rail uses, which orders by
 * play time and carries `lastPlayedAt` per row.
 *
 * Paged like My Packs: same `PACKS_FEED_PAGE_SIZE`, same `HomePagination`, so
 * the two sidebar siblings behave identically.
 */
export function fetchHistoryPage(
  userId: string,
  filters: HistoryFilters,
  limit: number,
): Promise<PackList<RecentlyPlayedPack>> {
  return usersClient.recentlyPlayed(userId, {
    page: filters.page,
    limit,
    format: filters.format,
    sort: filters.sort,
  });
}
