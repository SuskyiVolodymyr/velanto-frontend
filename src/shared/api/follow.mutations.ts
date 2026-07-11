"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import type { PublicUserProfile } from "@/src/shared/types/user";

export interface UseFollowMutationResult {
  /** Follow or unfollow, given whether the viewer *currently* follows. */
  toggle: (currentlyFollowing: boolean) => void;
  isPending: boolean;
  isError: boolean;
}

/**
 * Shared follow/unfollow mutation, reused by any screen that shows a follow
 * control (pack creator card, author page, …). Generic over the cache it
 * patches: pass the query key of any cache shaped `{ profile: PublicUserProfile }`
 * and its cached profile is updated in place on success (new follow state +
 * follower count, no refetch). Anonymous viewers are redirected to sign in
 * instead of mutating.
 */
export function useFollowMutation<T extends { profile: PublicUserProfile }>(
  authorId: string,
  profileQueryKey: QueryKey,
): UseFollowMutationResult {
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const mutation = useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing
        ? usersClient.unfollow(authorId)
        : usersClient.follow(authorId),
    onSuccess: (result, currentlyFollowing) => {
      queryClient.setQueryData<T>(profileQueryKey, (prev) =>
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

  return {
    toggle: (currentlyFollowing) => {
      if (status !== "authenticated") {
        router.push(`/auth?next=${encodeURIComponent(pathname)}`);
        return;
      }
      mutation.mutate(currentlyFollowing);
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
