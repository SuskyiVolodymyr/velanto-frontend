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

  it("list() forwards the sort param", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await commentsClient.list("pack-1", { sort: "new" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/packs/pack-1/comments?sort=new",
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

  it("create() forwards a parentId for a reply", async () => {
    vi.mocked(apiClient.post).mockResolvedValue(COMMENT);

    await commentsClient.create("pack-1", { body: "a reply", parentId: "c1" });

    expect(apiClient.post).toHaveBeenCalledWith("/packs/pack-1/comments", {
      body: "a reply",
      parentId: "c1",
    });
  });

  it("vote() posts the value to the comment vote endpoint", async () => {
    const tally = { score: 1, likes: 1, dislikes: 0, myVote: 1 as const };
    vi.mocked(apiClient.post).mockResolvedValue(tally);

    const result = await commentsClient.vote("pack-1", "c1", 1);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/packs/pack-1/comments/c1/vote",
      { value: 1 },
    );
    expect(result).toEqual(tally);
  });
});
