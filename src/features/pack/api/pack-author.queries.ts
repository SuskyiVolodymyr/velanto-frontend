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

export function usePackAuthor(authorId: string) {
  return useQuery(packAuthorQueryOptions(authorId));
}
