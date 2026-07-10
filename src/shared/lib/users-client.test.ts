// src/shared/lib/users-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { usersClient } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn(), get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usersClient", () => {
  it("ban() posts duration and a category reason to /users/:id/ban", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: "u2",
      bannedUntil: "2026-01-08T00:00:00.000Z",
    });

    const result = await usersClient.ban("u2", {
      duration: "week",
      reason: "spam_manipulation",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/ban", {
      duration: "week",
      reason: "spam_manipulation",
    });
    expect(result).toEqual({
      id: "u2",
      bannedUntil: "2026-01-08T00:00:00.000Z",
    });
  });

  it("ban() forwards reasonDetail for an 'other' reason", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: "u2",
      bannedUntil: "2026-01-08T00:00:00.000Z",
    });

    await usersClient.ban("u2", {
      duration: "forever",
      reason: "other",
      reasonDetail: "manual review",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/ban", {
      duration: "forever",
      reason: "other",
      reasonDetail: "manual review",
    });
  });

  it("unban() posts to /users/:id/unban with no body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: "u2",
      bannedUntil: null,
    });

    const result = await usersClient.unban("u2");

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/unban");
    expect(result).toEqual({ id: "u2", bannedUntil: null });
  });

  it("changeRole() patches the role to /users/:id/role", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      id: "u2",
      role: "moderator",
    });

    const result = await usersClient.changeRole("u2", "moderator");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/u2/role", {
      role: "moderator",
    });
    expect(result).toEqual({ id: "u2", role: "moderator" });
  });

  it("getProfile fetches a user's public profile by id", async () => {
    const profile = {
      id: "user-1",
      username: "alice",
      bio: "hello",
      createdAt: "2026-01-01T00:00:00.000Z",
      followerCount: 3,
      isFollowedByMe: false,
    };
    vi.mocked(apiClient.get).mockResolvedValue(profile);

    const result = await usersClient.getProfile("user-1");

    expect(apiClient.get).toHaveBeenCalledWith("/users/user-1");
    expect(result).toEqual(profile);
  });

  it("updateProfile PATCHes the caller's own bio", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      id: "user-1",
      bio: "New bio",
    });

    const result = await usersClient.updateProfile("New bio");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/me", {
      bio: "New bio",
    });
    expect(result).toEqual({ id: "user-1", bio: "New bio" });
  });
});

describe("usersClient.follow", () => {
  it("POSTs to /users/:id/follow", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ followerCount: 5 });
    const result = await usersClient.follow("user-1");
    expect(postSpy).toHaveBeenCalledWith("/users/user-1/follow");
    expect(result).toEqual({ followerCount: 5 });
  });
});

describe("usersClient.unfollow", () => {
  it("POSTs to /users/:id/unfollow", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ followerCount: 4 });
    const result = await usersClient.unfollow("user-1");
    expect(postSpy).toHaveBeenCalledWith("/users/user-1/unfollow");
    expect(result).toEqual({ followerCount: 4 });
  });
});

describe("usersClient.banHistory", () => {
  it("GETs /users/:id/ban-history with page/limit query params", async () => {
    const page = {
      items: [
        {
          actorUsername: "mod1",
          meta: { duration: "week", reason: "spam" },
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(page);
    const result = await usersClient.banHistory("user-1", {
      page: 1,
      limit: 20,
    });
    expect(getSpy).toHaveBeenCalledWith(
      "/users/user-1/ban-history?page=1&limit=20",
    );
    expect(result).toEqual(page);
  });

  it("omits query params when not provided", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    await usersClient.banHistory("user-1");
    expect(getSpy).toHaveBeenCalledWith("/users/user-1/ban-history");
  });
});
