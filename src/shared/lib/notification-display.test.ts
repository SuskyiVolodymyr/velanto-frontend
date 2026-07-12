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
      message: "alice started following you",
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
      message: "bob published a new pack: Anime OSTs",
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
      message: "carol commented on your pack Anime OSTs",
      href: "/packs/p1",
    });
  });

  it("formats pack_deleted_warning with no link", () => {
    const result = describeNotification(
      makeNotification({
        type: "pack_deleted_warning",
        payload: { packTitle: "Old Pack" },
      }),
    );
    expect(result).toEqual({
      message: 'Your pack "Old Pack" was removed by a moderator',
      href: null,
    });
  });

  it("falls back to a generic row for an unknown notification type (forward-compat)", () => {
    const result = describeNotification(
      makeNotification({
        // A type this client doesn't know yet (e.g. a newer backend type). The
        // cast models a server sending a type outside the current union.
        type: "comment_mention" as Notification["type"],
        payload: { packId: "p1" },
      }),
    );
    expect(result).toEqual({
      message: "You have a new notification",
      href: null,
    });
  });
});
