import {
  queryOptions,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { getMyPacks, type MyPacksFilters } from "./my-packs";

export function myPacksQueryOptions(authorId: string, filters: MyPacksFilters) {
  return queryOptions({
    queryKey: ["my-packs", authorId, filters] as const,
    queryFn: () => getMyPacks(authorId, filters),
  });
}

/**
 * The signed-in user's own packs, keyed on author + the active status/page so
 * each combination caches separately. `keepPreviousData` keeps the grid steady
 * while switching status chips or pages; `staleTime: 0` refetches so a pack that
 * just changed status (published, re-drafted, moderated) shows up. Window-focus
 * refetches are off, matching the discovery feed.
 */
export function useMyPacks(authorId: string, filters: MyPacksFilters) {
  return useQuery({
    ...myPacksQueryOptions(authorId, filters),
    enabled: authorId !== "",
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
