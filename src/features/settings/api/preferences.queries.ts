"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usersClient } from "@/src/shared/lib/users-client";
import type { MyProfile } from "@/src/shared/types/user";

export function myProfileQueryOptions() {
  return queryOptions({
    queryKey: ["me"] as const,
    queryFn: () => usersClient.getMe(),
  });
}

/** The caller's own profile; gate with `enabled` (auth-only). */
export function useMyProfile({ enabled }: { enabled: boolean }) {
  return useQuery({ ...myProfileQueryOptions(), enabled });
}

/**
 * Toggle the play-history privacy preference. On success the cached `me`
 * profile is patched with the new value so the switch reflects it without a
 * refetch. No optimistic update — a failed toggle leaves the switch as it was.
 */
export function useSetPlayHistory() {
  const queryClient = useQueryClient();
  const { queryKey } = myProfileQueryOptions();
  return useMutation({
    mutationFn: (showPlayHistory: boolean) =>
      usersClient.updatePreferences(showPlayHistory),
    onSuccess: ({ showPlayHistory }) => {
      queryClient.setQueryData<MyProfile>(queryKey, (prev) =>
        prev ? { ...prev, showPlayHistory } : prev,
      );
      // The public profile reads showPlayHistory too; drop its cache so a
      // re-view reflects the change.
      void queryClient.invalidateQueries({ queryKey: ["author"] });
    },
  });
}
