import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { commentsClient } from "@/src/shared/lib/comments-client";
import type { Comment } from "@/src/shared/types/comment";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const COMMENT: Comment = {
  id: "c1",
  packId: "pack-1",
  authorId: "u1",
  authorUsername: "alice",
  body: "Great pack!",
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("commentsClient", () => {
  it("list() fetches comments for a pack", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([COMMENT]);

    const result = await commentsClient.list("pack-1");

    expect(apiClient.get).toHaveBeenCalledWith("/packs/pack-1/comments");
    expect(result).toEqual([COMMENT]);
  });

  it("create() posts a comment body for a pack", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(COMMENT);

    const result = await commentsClient.create("pack-1", { body: "Great pack!" });

    expect(apiClient.post).toHaveBeenCalledWith("/packs/pack-1/comments", {
      body: "Great pack!",
    });
    expect(result).toEqual(COMMENT);
  });
});
