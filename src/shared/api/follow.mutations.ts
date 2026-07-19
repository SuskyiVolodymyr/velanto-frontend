"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import type { PublicUserProfile } from "@/src/shared/types/user";

export interface UseFollowMutationResult {
  /** Follow or unfollow, given whether the viewer *currently* follows. */
  toggle: (currentlyFollowing: boolean) => void;
  isPending: boolean;
  isError: boolean;
  /**
   * True when the viewer is not a confirmed signed-in user — signed out OR auth
   * not yet settled. The follow control should stay hidden until this is false,
   * so it never flashes during the initial auth refresh (see below).
   */
  blocked: boolean;
}

/**
 * Shared follow/unfollow mutation, reused by any screen that shows a follow
 * control (pack creator card, author page, …). Generic over the cache it
 * patches: pass the query key of any cache shaped `{ profile: PublicUserProfile }`
 * and its cached profile is updated in place on success (new follow state +
 * follower count, no refetch). Viewers who aren't confirmed signed-in (signed
 * out, or auth still settling) are `blocked`: `toggle` no-ops, and callers keep
 * the control hidden until auth settles rather than flashing it or firing a
 * surprise redirect.
 */
export function useFollowMutation<T extends { profile: PublicUserProfile }>(
  authorId: string,
  profileQueryKey: QueryKey,
): UseFollowMutationResult {
  const queryClient = useQueryClient();
  const { status } = useAuth();
  // Blocked until the viewer is a *confirmed* signed-in user — i.e. also during
  // the initial auth refresh ("loading"), not just when signed out. Consumers
  // hide the follow control while blocked, which is what stops a Follow button
  // from flashing on your OWN page during the load window (isOwnProfile is still
  // false until auth settles, so without this it would render — and it was
  // aimable at yourself before flipping to Edit). `toggle` already no-ops unless
  // authenticated, so this only changes what renders, never what can fire.
  const blocked = status !== "authenticated";

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
      if (status !== "authenticated") return;
      mutation.mutate(currentlyFollowing);
    },
    isPending: mutation.isPending,
    isError: mutation.isError,
    blocked,
  };
}
