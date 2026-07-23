import { describe, it, expect } from "vitest";
import { describeNotification } from "./notification-display";
import type { Notification } from "@/src/shared/types/notification";

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: "n1",
    type: "new_follower",
    payload: {},
    readAt: null,
    createdAt: "2026-07-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("describeNotification", () => {
  it("formats new_follower with a link to the follower's profile", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_follower",
        payload: { followerId: "u1", followerUsername: "alice" },
      }),
    );
    expect(result).toEqual({
      messageKey: "newFollower",
      kindKey: "kindFollower",
      values: { username: "alice" },
      excerpt: null,
      href: "/users/u1",
    });
  });

  it("formats new_pack_from_followed with a link to the pack", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_pack_from_followed",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          authorUsername: "bob",
        },
      }),
    );
    expect(result).toEqual({
      messageKey: "newPack",
      kindKey: "kindNewPack",
      values: { username: "bob", packTitle: "Anime OSTs" },
      excerpt: null,
      href: "/packs/p1",
    });
  });

  it("formats new_comment with a link to the pack", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_comment",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          commentId: "c1",
          commenterUsername: "carol",
        },
      }),
    );
    expect(result).toEqual({
      messageKey: "newComment",
      kindKey: "kindComment",
      values: { username: "carol", packTitle: "Anime OSTs" },
      excerpt: null,
      href: "/packs/p1",
    });
  });

  it("carries a trimmed comment body as the excerpt when present", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_comment",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          commenterUsername: "carol",
          excerpt: "  this tier order is perfect  ",
        },
      }),
    );
    expect(result.excerpt).toBe("this tier order is perfect");
  });

  it("null-outs a blank/whitespace-only excerpt so no empty quote renders", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_comment",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          commenterUsername: "carol",
          excerpt: "   ",
        },
      }),
    );
    expect(result.excerpt).toBeNull();
  });

  it("formats pack_deleted_warning with no link", () => {
    const result = describeNotification(
      makeNotification({
        type: "pack_deleted_warning",
        payload: { packTitle: "Old Pack" },
      }),
    );
    expect(result).toEqual({
      messageKey: "packDeleted",
      kindKey: "kindModeration",
      values: { packTitle: "Old Pack" },
      excerpt: null,
      href: null,
    });
  });

  it("formats comment_mention with a link to the pack", () => {
    const result = describeNotification(
      makeNotification({
        type: "comment_mention",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          commentId: "c1",
          mentionerUsername: "dave",
        },
      }),
    );
    expect(result).toEqual({
      messageKey: "commentMention",
      kindKey: "kindMention",
      values: { username: "dave", packTitle: "Anime OSTs" },
      excerpt: null,
      href: "/packs/p1",
    });
  });

  it("formats comment_reply with a link to the pack", () => {
    const result = describeNotification(
      makeNotification({
        type: "comment_reply",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          commentId: "c1",
          replierUsername: "erin",
        },
      }),
    );
    expect(result).toEqual({
      messageKey: "commentReply",
      kindKey: "kindReply",
      values: { username: "erin", packTitle: "Anime OSTs" },
      excerpt: null,
      href: "/packs/p1",
    });
  });

  it("falls back to a generic row for an unknown notification type (forward-compat)", () => {
    const result = describeNotification(
      makeNotification({
        // A type this client doesn't know yet (e.g. a newer backend type). The
        // cast models a server sending a type outside the current union.
        type: "some_future_type" as Notification["type"],
        payload: { packId: "p1" },
      }),
    );
    expect(result).toEqual({
      messageKey: "generic",
      kindKey: "kindGeneric",
      values: {},
      excerpt: null,
      href: null,
    });
  });
});
