import {
  queryOptions,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { fetchHistoryPage, type HistoryFilters } from "./history";
import { PACKS_FEED_PAGE_SIZE } from "./packs-feed";

export function historyQueryOptions(userId: string, filters: HistoryFilters) {
  return queryOptions({
    queryKey: ["history", userId, filters] as const,
    queryFn: () => fetchHistoryPage(userId, filters, PACKS_FEED_PAGE_SIZE),
  });
}

/**
 * The signed-in user's play history, keyed on the active format/order/page so
 * each combination caches separately. `keepPreviousData` holds the grid steady
 * while switching chips or pages, matching My Packs. `staleTime: 0` so
 * finishing a play and coming back here shows it — this page is a record of
 * something you just did, and a stale list would be visibly wrong.
 */
export function useHistory(userId: string, filters: HistoryFilters) {
  return useQuery({
    ...historyQueryOptions(userId, filters),
    enabled: userId !== "",
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
