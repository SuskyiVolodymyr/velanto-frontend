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

// Long enough that a visitor who lands and leaves does not force a second
// identical request. `initialData` arrives with no `initialDataUpdatedAt`, so
// React Query treats it as fresh-as-of-now — meaning any staleTime above zero
// suppresses the refetch-on-mount that used to fire immediately after
// hydration. That refetch made every human home-page visit cost TWO identical
// backend list calls (the SSR seed, then the client's copy of it), and the
// second one bypassed the server cache entirely.
const FEED_STALE_MS = 5 * 60_000;

/**
 * The home feed, keyed on the active filters so each combination caches
 * separately. Revisiting a filter shows its packs instantly from cache (via
 * `keepPreviousData`, so filter changes never flash a loading state).
 * Window-focus refetches are disabled to match the old behavior. The
 * default-filters query is seeded from the SSR feed via `initialData`.
 *
 * A changed filter is a different query key, so it still fetches immediately —
 * `FEED_STALE_MS` only affects re-viewing the SAME filter combination, where
 * a few minutes of staleness on a discovery feed is not something a visitor
 * can perceive. Publishing a pack invalidates this key explicitly so an author
 * still sees their own new pack at once.
 */
export function usePacksFeed(
  filters: PacksFeedFilters,
  initialData?: PacksFeedResult,
) {
  return useQuery({
    ...packsFeedQueryOptions(filters),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: FEED_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
