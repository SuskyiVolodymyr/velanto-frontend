"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
import { authorQueryOptions } from "@/src/features/author/api/author.queries";

export function myProfileQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["my-profile", userId] as const,
    queryFn: () => usersClient.getProfile(userId),
  });
}

/** The current user's own public profile (for the edit form); gate with `enabled`. */
export function useMyProfile(userId: string, { enabled }: { enabled: boolean }) {
  return useQuery({ ...myProfileQueryOptions(userId), enabled });
}

/**
 * Save the current user's bio. Invalidates every cache that shows this user's
 * profile (the edit form's own query and the profile/author page) so they pick
 * up the new bio.
 */
export function useUpdateBio(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bio: string) => usersClient.updateProfile(bio),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: myProfileQueryOptions(userId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: authorQueryOptions(userId).queryKey,
      });
    },
  });
}
