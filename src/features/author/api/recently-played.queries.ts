import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import {
  RECENTLY_PLAYED_PAGE_SIZE,
  fetchRecentlyPlayedPage,
} from "./recently-played";

/**
 * A user's recently-played packs as an infinite (append-on-scroll) list, keyed
 * by user. `getNextPageParam` stops once every visible pack is loaded — same
 * shape as the author-packs list. `enabled` gates the fetch so the section
 * doesn't request a hidden (opted-out) user's history.
 */
export function recentlyPlayedInfiniteQueryOptions(userId: string) {
  return infiniteQueryOptions({
    queryKey: ["recently-played", userId] as const,
    queryFn: ({ pageParam }) => fetchRecentlyPlayedPage(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useRecentlyPlayed(userId: string, enabled: boolean) {
  return useInfiniteQuery({
    ...recentlyPlayedInfiniteQueryOptions(userId),
    enabled,
  });
}

export { RECENTLY_PLAYED_PAGE_SIZE };
