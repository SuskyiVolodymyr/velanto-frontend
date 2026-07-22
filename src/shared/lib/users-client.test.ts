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

  it("search() gets /users/search with the query and pagination", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 20,
    });

    await usersClient.search("alice", { page: 2, limit: 20 });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/users/search?q=alice&page=2&limit=20",
    );
  });

  it("search() omits pagination params when not provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await usersClient.search("bob");

    expect(apiClient.get).toHaveBeenCalledWith("/users/search?q=bob");
  });
});
