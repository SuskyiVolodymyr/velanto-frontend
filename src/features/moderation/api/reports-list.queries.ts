"use client";

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { fetchReportsPage, type ReportsListFilters } from "./reports-list";

/**
 * The Reports tab pages with Prev/Next (per the mock), so this is a
 * page-at-a-time query rather than the infinite/Load-more one the old support
 * queue used. `keepPreviousData` holds the current page on screen while the
 * next one loads, instead of flashing empty.
 */
export function reportsListQueryOptions(
  filters: ReportsListFilters,
  page: number,
) {
  return queryOptions({
    queryKey: ["reports-list", filters, page] as const,
    queryFn: () => fetchReportsPage(filters, page),
    placeholderData: keepPreviousData,
  });
}

/** Pass `enabled` to gate the fetch to an authorized viewer. */
export function useReportsList(
  filters: ReportsListFilters,
  page: number,
  { enabled }: { enabled: boolean },
) {
  return useQuery({ ...reportsListQueryOptions(filters, page), enabled });
}
