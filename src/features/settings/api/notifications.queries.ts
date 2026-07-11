"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import type {
  NotificationPreferences,
  NotificationType,
} from "@/src/shared/types/notification";

export function notificationPreferencesQueryOptions() {
  return queryOptions({
    queryKey: ["notification-preferences"] as const,
    queryFn: () => notificationsClient.getPreferences(),
  });
}

/** The viewer's notification preferences; gate with `enabled` (auth-only). */
export function useNotificationPreferences({ enabled }: { enabled: boolean }) {
  return useQuery({ ...notificationPreferencesQueryOptions(), enabled });
}

/**
 * Toggle a single notification preference. On success the preferences cache is
 * replaced with the server's returned set, so the switches reflect the new
 * state without a refetch. No optimistic update — a failed toggle leaves the
 * cache (and thus the switch) at its prior state. `variables.type` identifies
 * which row is in flight / errored, so the section can scope busy/error to it.
 */
export function useSetNotificationPreference() {
  const queryClient = useQueryClient();
  const { queryKey } = notificationPreferencesQueryOptions();
  return useMutation({
    mutationFn: ({ type, value }: { type: NotificationType; value: boolean }) =>
      notificationsClient.setPreferences({ [type]: value }),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationPreferences>(queryKey, updated);
    },
  });
}
