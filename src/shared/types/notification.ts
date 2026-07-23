export const NOTIFICATION_TYPES = [
  "new_follower",
  "new_pack_from_followed",
  "new_comment",
  "comment_mention",
  "comment_reply",
  "pack_deleted_warning",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

export type NotificationPreferences = Record<NotificationType, boolean>;
