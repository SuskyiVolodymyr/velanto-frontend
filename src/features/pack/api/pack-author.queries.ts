import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPackAuthor } from "./pack-author";

/**
 * Reusable query definition for a pack author. Exposed as a `queryOptions`
 * factory (not just a hook) so the same key + fetcher can drive `useQuery` in
 * components, a server-side `prefetchQuery`, or a `setQueryData` cache write —
 * all sharing one source of truth for the key.
 */
export function packAuthorQueryOptions(authorId: string) {
  return queryOptions({
    queryKey: ["pack-author", authorId] as const,
    queryFn: () => getPackAuthor(authorId),
  });
}

export function usePackAuthor(
  authorId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...packAuthorQueryOptions(authorId),
    enabled: options?.enabled ?? true,
    // The identity rarely changes within a session, and the follow toggle
    // patches the cache directly — so a hovered author (in a long comment list)
    // isn't re-fetched on every hover-in.
    staleTime: 5 * 60 * 1000,
  });
}
