import {
  queryOptions,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  getPacksFeed,
  type PacksFeedFilters,
  type PacksFeedResult,
} from "./packs-feed";

export function packsFeedQueryOptions(filters: PacksFeedFilters) {
  return queryOptions({
    queryKey: ["packs-feed", filters] as const,
    queryFn: () => getPacksFeed(filters),
  });
}

/**
 * The home feed, keyed on the active filters so each combination caches
 * separately. Revisiting a filter shows its packs instantly from cache (via
 * `keepPreviousData`, so filter changes never flash a loading state) and then
 * refetches in the background — `staleTime: 0` keeps a discovery feed fresh.
 * Window-focus refetches are disabled to match the old behavior. The
 * default-filters query is seeded from the SSR feed via `initialData`.
 */
export function usePacksFeed(
  filters: PacksFeedFilters,
  initialData?: PacksFeedResult,
) {
  return useQuery({
    ...packsFeedQueryOptions(filters),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
