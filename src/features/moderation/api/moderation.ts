import { packsClient } from "@/src/shared/lib/packs-client";
import { moderationClient } from "@/src/shared/lib/moderation-client";
import type { PackFormat } from "@/src/shared/types/pack";

/** Both tabs page at the same size, so the two tables line up visually. */
export const MODERATION_PAGE_SIZE = 20;

/** Oldest-first (FIFO) is the backend's default and the one moderators want:
 * the queue is a backlog, and newest-first starves whatever is at the bottom. */
export type PackQueueSort = "oldest" | "newest";

/** The pack-approval queue's filters. Also the query key, so its values fully
 * determine a cache entry. */
export interface PackQueueFilters {
  /** Title search. */
  q: string;
  /** "" = any format. */
  format: PackFormat | "";
  sort: PackQueueSort;
}

export const EMPTY_PACK_QUEUE_FILTERS: PackQueueFilters = {
  q: "",
  format: "",
  sort: "oldest",
};

export function fetchPackQueuePage(filters: PackQueueFilters, page: number) {
  return packsClient.moderationQueue({
    q: filters.q || undefined,
    format: filters.format || undefined,
    sort: filters.sort,
    page,
    limit: MODERATION_PAGE_SIZE,
  });
}

export function fetchModerationCounts() {
  return moderationClient.counts();
}
