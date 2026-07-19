import { packsClient } from "@/src/shared/lib/packs-client";
import type { PackStatus } from "@/src/shared/types/pack";
import {
  PACKS_FEED_PAGE_SIZE,
  type PacksFeedResult,
} from "@/src/features/home/api/packs-feed";

/**
 * The "My packs" request shape, already resolved from the UI. Also serves as
 * part of the query key, so its values fully determine a cache entry.
 */
export interface MyPacksFilters {
  /** One moderation status, or undefined for the "All" chip (every status). */
  status?: PackStatus;
  page?: number;
}

/**
 * The signed-in user's own packs across every moderation status (drafts,
 * pending, approved, rejected). The backend returns all statuses only for a
 * self-author view — `authorId` MUST be the signed-in user, which the caller
 * guarantees. Newest-first: when managing your own packs the most recent is the
 * most relevant, and "popular" is meaningless for an unplayed draft.
 */
export async function getMyPacks(
  authorId: string,
  filters: MyPacksFilters,
): Promise<PacksFeedResult> {
  const result = await packsClient.list({
    authorId,
    status: filters.status,
    page: filters.page && filters.page > 1 ? filters.page : undefined,
    limit: PACKS_FEED_PAGE_SIZE,
    sort: "newest",
  });
  return { items: result.items, total: result.total };
}
