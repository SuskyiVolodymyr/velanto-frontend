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
  it("list() fetches the paginated envelope for a pack with no params", async () => {
    const envelope = { items: [COMMENT], total: 1, page: 1, limit: 10 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    const result = await commentsClient.list("pack-1");

    expect(apiClient.get).toHaveBeenCalledWith("/packs/pack-1/comments");
    expect(result).toEqual(envelope);
  });

  it("list() forwards page and limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 10,
    });

    await commentsClient.list("pack-1", { page: 2, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/packs/pack-1/comments?page=2&limit=10",
    );
  });

  it("create() posts a comment body for a pack", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(COMMENT);

    const result = await commentsClient.create("pack-1", {
      body: "Great pack!",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/packs/pack-1/comments", {
      body: "Great pack!",
    });
    expect(result).toEqual(COMMENT);
  });
});
