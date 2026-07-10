import { apiClient } from "@/src/shared/lib/api-client";
import type {
  Notification,
  NotificationList,
  NotificationPreferences,
} from "@/src/shared/types/notification";

function buildListQuery(filters: { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const notificationsClient = {
  list: (filters: { page?: number; limit?: number } = {}) =>
    apiClient.get<NotificationList>(`/notifications${buildListQuery(filters)}`),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`),
  markAllRead: () =>
    apiClient.post<{ updated: number }>("/notifications/read-all"),
  getPreferences: () =>
    apiClient.get<NotificationPreferences>("/notifications/preferences"),
  setPreferences: (updates: Partial<NotificationPreferences>) =>
    apiClient.patch<NotificationPreferences>(
      "/notifications/preferences",
      updates,
    ),
};
