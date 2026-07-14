"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
import { uploadMedia } from "@/src/shared/lib/media-client";
import { myProfileQueryOptions } from "@/src/features/profile/api/profile.queries";
import { authorQueryOptions } from "@/src/features/author/api/author.queries";

/** Invalidate every cache that renders this user's avatar so it refetches. */
function invalidateProfileCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  queryClient.invalidateQueries({
    queryKey: myProfileQueryOptions(userId).queryKey,
  });
  queryClient.invalidateQueries({
    queryKey: authorQueryOptions(userId).queryKey,
  });
}

/**
 * Two-step avatar update: upload the image to the media endpoint, then point the
 * caller's profile at the returned storage key. The file is validated
 * (image / ≤1MB) by the caller before this fires. Invalidates the profile caches
 * on success so the new avatar shows everywhere it's rendered; the returned
 * `avatarKey` lets the caller patch the header (AuthContext) live too.
 */
export function useUpdateAvatar(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { key } = await uploadMedia(file, "avatar");
      return usersClient.setAvatar(key);
    },
    onSuccess: () => invalidateProfileCaches(queryClient, userId),
  });
}

/** Clear the caller's avatar back to the initials placeholder. */
export function useRemoveAvatar(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => usersClient.removeAvatar(),
    onSuccess: () => invalidateProfileCaches(queryClient, userId),
  });
}
