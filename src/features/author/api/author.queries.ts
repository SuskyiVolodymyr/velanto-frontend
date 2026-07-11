import { queryOptions, useQuery } from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
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
  return useQuery({ ...authorQueryOptions(authorId), initialData });
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
