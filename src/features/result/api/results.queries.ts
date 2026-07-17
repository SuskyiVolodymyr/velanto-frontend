import { queryOptions, useQuery } from "@tanstack/react-query";
import { playsClient } from "@/src/shared/lib/plays-client";

/**
 * A pack's community results, fetched client-side.
 *
 * Client-side rather than in the Server Component (velanto-frontend#243). The
 * result screen is gated on evidence that you played (#222), and that evidence
 * lives in sessionStorage — so the server cannot know whether the numbers will
 * be shown. It was fetching them for everyone and throwing them away for anyone
 * locked out: a `no-store` round-trip per visitor who was about to be shown
 * nothing, and the aggregate sitting in the RSC payload of a page that had just
 * refused to display it.
 *
 * (That payload was never a security problem — `GET /packs/:id/results` is
 * public by design, so the numbers are one curl away regardless, and #222's
 * gate is a UX promise rather than a boundary. It was simply pointless.)
 *
 * No `staleTime`: the aggregate must include the play you just recorded, which
 * is the same reason `getResultsServer` uses `cache: "no-store"`.
 */
export function packResultsQueryOptions(packId: string) {
  return queryOptions({
    queryKey: ["pack-results", packId] as const,
    queryFn: () => playsClient.getResults(packId),
  });
}

/**
 * `enabled` is the whole point: pass the caller's "has this person played?"
 * signal so a locked visitor never triggers the request at all.
 */
export function usePackResults(packId: string, enabled: boolean) {
  return useQuery({ ...packResultsQueryOptions(packId), enabled });
}
