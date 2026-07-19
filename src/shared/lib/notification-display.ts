import type { Notification } from "@/src/shared/types/notification";

/**
 * A notification resolved to a translation KEY (in the `notifications`
 * namespace) plus its interpolation values, an optional snippet, its type
 * label, and a link — rather than a pre-built English string, so the rendering
 * component (NotificationItem) can localize it. This file is a pure, non-React
 * mapper, so it can't call `useTranslations` itself.
 */
export interface NotificationDisplay {
  /** Rich message key (uses <user>/<muted>/<obj> tags — see the catalog). */
  messageKey: string;
  /** The type-label i18n key shown in the meta row (e.g. "Comment"). */
  kindKey: string;
  values: Record<string, string>;
  /** A quoted excerpt to show under the message (comment / mention body), or
   *  null when the type carries no snippet. */
  excerpt: string | null;
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
  /** The comment body, added to the payload for the snippet (optional — older
   *  notifications created before this field shipped won't have it). */
  excerpt?: string;
}
interface CommentMentionPayload {
  packId: string;
  packTitle: string;
  commentId: string;
  mentionerUsername: string;
  excerpt?: string;
}
interface PackDeletedWarningPayload {
  packTitle: string;
}

/** Trim whitespace and null-out an empty snippet so it never renders a blank
 *  quote box. */
function snippet(text: string | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

export function describeNotification(
  notification: Notification,
): NotificationDisplay {
  switch (notification.type) {
    case "new_follower": {
      const payload = notification.payload as NewFollowerPayload;
      return {
        messageKey: "newFollower",
        kindKey: "kindFollower",
        values: { username: payload.followerUsername },
        excerpt: null,
        href: `/users/${payload.followerId}`,
      };
    }
    case "new_pack_from_followed": {
      const payload = notification.payload as NewPackFromFollowedPayload;
      return {
        messageKey: "newPack",
        kindKey: "kindNewPack",
        values: {
          username: payload.authorUsername,
          packTitle: payload.packTitle,
        },
        excerpt: null,
        href: `/packs/${payload.packId}`,
      };
    }
    case "new_comment": {
      const payload = notification.payload as NewCommentPayload;
      return {
        messageKey: "newComment",
        kindKey: "kindComment",
        values: {
          username: payload.commenterUsername,
          packTitle: payload.packTitle,
        },
        excerpt: snippet(payload.excerpt),
        href: `/packs/${payload.packId}`,
      };
    }
    case "comment_mention": {
      const payload = notification.payload as CommentMentionPayload;
      return {
        messageKey: "commentMention",
        kindKey: "kindMention",
        values: {
          username: payload.mentionerUsername,
          packTitle: payload.packTitle,
        },
        excerpt: snippet(payload.excerpt),
        href: `/packs/${payload.packId}`,
      };
    }
    case "pack_deleted_warning": {
      const payload = notification.payload as PackDeletedWarningPayload;
      return {
        messageKey: "packDeleted",
        kindKey: "kindModeration",
        values: { packTitle: payload.packTitle },
        excerpt: null,
        href: null,
      };
    }
    default:
      // A notification type this client version doesn't recognize yet — e.g. a
      // newer backend type shipped before this client adds its own case. Render
      // a safe generic row instead of returning undefined and crashing the list.
      return {
        messageKey: "generic",
        kindKey: "kindGeneric",
        values: {},
        excerpt: null,
        href: null,
      };
  }
}
