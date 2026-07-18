"use client";

import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  usersClient,
  type FollowUserPage,
} from "@/src/shared/lib/users-client";

export type FollowListKind = "followers" | "following";

export const FOLLOW_LIST_PAGE_SIZE = 20;

/**
 * A user's followers or following as an infinite (append-on-demand) list, keyed
 * by kind + author. Same getNextPageParam shape as the author-packs list.
 */
export function followListInfiniteQueryOptions(
  authorId: string,
  kind: FollowListKind,
) {
  return infiniteQueryOptions({
    queryKey: ["follow-list", kind, authorId] as const,
    queryFn: ({ pageParam }) => {
      const params = { page: pageParam, limit: FOLLOW_LIST_PAGE_SIZE };
      return kind === "followers"
        ? usersClient.followers(authorId, params)
        : usersClient.following(authorId, params);
    },
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

export function useFollowList(authorId: string, kind: FollowListKind) {
  return useInfiniteQuery(followListInfiniteQueryOptions(authorId, kind));
}

/**
 * Follow/unfollow a user shown in a follow list. On success it patches that
 * user's `isFollowedByMe` across every cached follow-list (both tabs), so the
 * row's button reflects the new state without a refetch. One instance per row,
 * so each row has its own pending state.
 */
export function useFollowListRowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      currentlyFollowing,
    }: {
      userId: string;
      currentlyFollowing: boolean;
    }) =>
      currentlyFollowing
        ? usersClient.unfollow(userId)
        : usersClient.follow(userId),
    onSuccess: (_result, { userId, currentlyFollowing }) => {
      queryClient.setQueriesData<InfiniteData<FollowUserPage, number>>(
        { queryKey: ["follow-list"] },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) =>
                    item.id === userId
                      ? { ...item, isFollowedByMe: !currentlyFollowing }
                      : item,
                  ),
                })),
              }
            : data,
      );
    },
  });
}
