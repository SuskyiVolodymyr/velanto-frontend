import type { Notification } from "@/src/shared/types/notification";

/**
 * A notification resolved to a translation KEY (in the `notifications`
 * namespace) plus its interpolation values and a link, rather than a pre-built
 * English string — so the rendering component (NotificationItem) can localize
 * it. This file is a pure, non-React mapper, so it can't call `useTranslations`
 * itself.
 */
export interface NotificationDisplay {
  messageKey: string;
  values: Record<string, string>;
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
interface CommentMentionPayload {
  packId: string;
  packTitle: string;
  commentId: string;
  mentionerUsername: string;
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
        messageKey: "newFollower",
        values: { username: payload.followerUsername },
        href: `/users/${payload.followerId}`,
      };
    }
    case "new_pack_from_followed": {
      const payload = notification.payload as NewPackFromFollowedPayload;
      return {
        messageKey: "newPack",
        values: {
          username: payload.authorUsername,
          packTitle: payload.packTitle,
        },
        href: `/packs/${payload.packId}`,
      };
    }
    case "new_comment": {
      const payload = notification.payload as NewCommentPayload;
      return {
        messageKey: "newComment",
        values: {
          username: payload.commenterUsername,
          packTitle: payload.packTitle,
        },
        href: `/packs/${payload.packId}`,
      };
    }
    case "comment_mention": {
      const payload = notification.payload as CommentMentionPayload;
      return {
        messageKey: "commentMention",
        values: {
          username: payload.mentionerUsername,
          packTitle: payload.packTitle,
        },
        href: `/packs/${payload.packId}`,
      };
    }
    case "pack_deleted_warning": {
      const payload = notification.payload as PackDeletedWarningPayload;
      return {
        messageKey: "packDeleted",
        values: { packTitle: payload.packTitle },
        href: null,
      };
    }
    default:
      // A notification type this client version doesn't recognize yet — e.g. a
      // newer backend type shipped before this client adds its own case. Render
      // a safe generic row instead of returning undefined and crashing the list.
      return { messageKey: "generic", values: {}, href: null };
  }
}
