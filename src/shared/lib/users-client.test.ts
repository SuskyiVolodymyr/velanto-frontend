// src/shared/lib/users-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { usersClient } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usersClient", () => {
  it("ban() posts duration and reason to /users/:id/ban", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: "u2", bannedUntil: "2026-01-08T00:00:00.000Z" });

    const result = await usersClient.ban("u2", { duration: "week", reason: "spamming" });

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/ban", {
      duration: "week",
      reason: "spamming",
    });
    expect(result).toEqual({ id: "u2", bannedUntil: "2026-01-08T00:00:00.000Z" });
  });

  it("unban() posts to /users/:id/unban with no body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: "u2", bannedUntil: null });

    const result = await usersClient.unban("u2");

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/unban");
    expect(result).toEqual({ id: "u2", bannedUntil: null });
  });

  it("changeRole() patches the role to /users/:id/role", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ id: "u2", role: "moderator" });

    const result = await usersClient.changeRole("u2", "moderator");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/u2/role", { role: "moderator" });
    expect(result).toEqual({ id: "u2", role: "moderator" });
  });
});
