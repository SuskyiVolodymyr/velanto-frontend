import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchReportsPage,
  type ReportsListFilters,
} from "./reports-list";

export function reportsListQueryOptions(filters: ReportsListFilters) {
  return infiniteQueryOptions({
    queryKey: ["reports-list", filters] as const,
    queryFn: ({ pageParam }) => fetchReportsPage(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

/** The support report queue. No `placeholderData`, so a filter change shows a
 * loading state (not the stale list). Pass `enabled` to gate to staff. */
export function useReportsList(
  filters: ReportsListFilters,
  { enabled }: { enabled: boolean },
) {
  return useInfiniteQuery({ ...reportsListQueryOptions(filters), enabled });
}
