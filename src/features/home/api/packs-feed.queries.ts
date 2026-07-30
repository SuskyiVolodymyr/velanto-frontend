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

// Long enough that re-viewing a filter combination inside one session does not
// re-request an identical list.
const FEED_STALE_MS = 5 * 60_000;

// The SSR seed is deliberately marked as maximally stale rather than left to
// default. Without this, `initialData` arrives with no `initialDataUpdatedAt`
// and React Query dates it as fresh-as-of-now, so any staleTime above zero
// suppresses the refetch-on-mount — and the seed comes out of Next's Data
// Cache, where it can be up to six hours old (see get-home-feed-server.ts).
// The visitor would then be served that cached copy with no path to a newer
// one: window-focus refetching is off and there is no interval.
//
// Costing this correctly matters, because it looks like it gives back the
// saving. It does not. Crawlers — the traffic that actually drove the compute
// bill — do not execute JavaScript, so they never reach this refetch and still
// only ever see the cached HTML. It adds one query per human home-page load,
// and Neon bills wall-clock time the compute is awake rather than queries, so
// a query issued while someone is already browsing lands inside awake time
// that is already paid for.
//
// `0` and not a computed timestamp: query-core dates the seed with
// `initialDataUpdatedAt ?? Date.now()`, and `??` passes a literal 0 through
// (verified against @tanstack/query-core 5.101.2).
const SSR_SEED_UPDATED_AT = 0;

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
 *
 * The server-seeded default query is the exception: it arrives already stale
 * (see `SSR_SEED_UPDATED_AT`) so first paint shows the cached feed and the
 * browser immediately replaces it with a current one.
 */
export function usePacksFeed(
  filters: PacksFeedFilters,
  initialData?: PacksFeedResult,
) {
  return useQuery({
    ...packsFeedQueryOptions(filters),
    initialData,
    initialDataUpdatedAt: initialData ? SSR_SEED_UPDATED_AT : undefined,
    placeholderData: keepPreviousData,
    staleTime: FEED_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
