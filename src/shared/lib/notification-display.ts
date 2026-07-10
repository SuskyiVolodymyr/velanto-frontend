import type { Notification } from "@/src/shared/types/notification";

export interface NotificationDisplay {
  message: string;
  href: string | null;
}

interface NewFollowerPayload {
  followerId: string;
  followerUsername: string;
}
interface NewPackFromFollowedPayload {
  packId: string;
  packTitle: string;
  authorUsername: string;
}
interface NewCommentPayload {
  packId: string;
  packTitle: string;
  commenterUsername: string;
}
interface PackDeletedWarningPayload {
  packTitle: string;
}

export function describeNotification(
  notification: Notification,
): NotificationDisplay {
  switch (notification.type) {
    case "new_follower": {
      const payload = notification.payload as NewFollowerPayload;
      return {
        message: `${payload.followerUsername} started following you`,
        href: `/users/${payload.followerId}`,
      };
    }
    case "new_pack_from_followed": {
      const payload = notification.payload as NewPackFromFollowedPayload;
      return {
        message: `${payload.authorUsername} published a new pack: ${payload.packTitle}`,
        href: `/packs/${payload.packId}`,
      };
    }
    case "new_comment": {
      const payload = notification.payload as NewCommentPayload;
      return {
        message: `${payload.commenterUsername} commented on your pack ${payload.packTitle}`,
        href: `/packs/${payload.packId}`,
      };
    }
    case "pack_deleted_warning": {
      const payload = notification.payload as PackDeletedWarningPayload;
      return {
        message: `Your pack "${payload.packTitle}" was removed by a moderator`,
        href: null,
      };
    }
  }
}
