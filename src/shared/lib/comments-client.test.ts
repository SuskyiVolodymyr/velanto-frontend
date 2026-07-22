import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { commentsClient } from "@/src/shared/lib/comments-client";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("commentsClient", () => {
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
});
