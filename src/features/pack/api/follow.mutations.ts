"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
import { packAuthorQueryOptions } from "./pack-author.queries";
import type { PackAuthor } from "./pack-author";

/**
 * Follow/unfollow mutation scoped to the pack-author query cache. The variable
 * passed to `mutate` is whether the viewer *currently* follows the author; on
 * success the cached author is patched with the new state + follower count, so
 * every reader of that query (the creator card, its hover popover) updates
 * without a refetch. The sign-in redirect for anonymous viewers stays in the
 * component — a mutation assumes an authenticated caller.
 */
export function useFollowMutation(authorId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = packAuthorQueryOptions(authorId);

  return useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing
        ? usersClient.unfollow(authorId)
        : usersClient.follow(authorId),
    onSuccess: (result, currentlyFollowing) => {
      queryClient.setQueryData<PackAuthor>(queryKey, (prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                isFollowedByMe: !currentlyFollowing,
                followerCount: result.followerCount,
              },
            }
          : prev,
      );
    },
  });
}
