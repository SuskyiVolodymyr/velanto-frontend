import { queryOptions, useQuery } from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
import { useRefetchOnSignIn } from "@/src/shared/lib/use-refetch-on-sign-in";
import { getAuthor, type AuthorData } from "./author";

export function authorQueryOptions(authorId: string) {
  return queryOptions({
    queryKey: ["author", authorId] as const,
    queryFn: () => getAuthor(authorId),
  });
}

/**
 * Author profile + packs. `initialData` seeds the SSR-rendered page so it shows
 * immediately (indexable) without a mount fetch — the follow mutation patches
 * this same cache, so follow state survives without a refetch.
 */
export function useAuthor(authorId: string, initialData?: AuthorData) {
  const query = useQuery({ ...authorQueryOptions(authorId), initialData });
  // The SSR seed is fetched anonymously, so viewer-specific fields come back
  // empty on a hard refresh: `isFollowedByMe` is false and — when you're viewing
  // your OWN page — your pending/rejected packs are absent. Refetch as the
  // viewer once signed in so both are correct (see useRefetchOnSignIn).
  useRefetchOnSignIn(query.refetch);
  return query;
}

export function authorBanHistoryQueryOptions(authorId: string) {
  return queryOptions({
    queryKey: ["author-ban-history", authorId] as const,
    queryFn: () => usersClient.banHistory(authorId, { page: 1, limit: 20 }),
  });
}

export function useAuthorBanHistory(
  authorId: string,
  { enabled }: { enabled?: boolean } = {},
) {
  return useQuery({ ...authorBanHistoryQueryOptions(authorId), enabled });
}
