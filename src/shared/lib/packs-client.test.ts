import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import {
  packsClient,
  type ListPacksFilters,
} from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const PACK_A: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  language: "en" as Pack["language"],
  format: "save_one",
  tags: ["Anime", "Music"],
  groups: [{ id: "g1", name: "2016", items: [] }],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("packsClient.list", () => {
  it("returns the paginated envelope from the API", async () => {
    const envelope = { items: [PACK_A], total: 1, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    const result = await packsClient.list();

    expect(result).toEqual(envelope);
  });

  it.each([
    ["no filters (also omits sort and window)", undefined, "/packs"],
    [
      "format and tags",
      { format: "save_one", tags: ["Anime", "Music"] },
      "/packs?format=save_one&tags=Anime%2CMusic",
    ],
    ["page and limit", { page: 2, limit: 50 }, "/packs?page=2&limit=50"],
    ["q", { q: "anime" }, "/packs?q=anime"],
    ["empty q omitted", { q: "" }, "/packs"],
    ["authorId", { authorId: "user-1" }, "/packs?authorId=user-1"],
    [
      "authorId and status",
      { authorId: "user-1", status: "draft" },
      "/packs?authorId=user-1&status=draft",
    ],
    ["sort", { sort: "popular" }, "/packs?sort=popular"],
    ["window", { window: "week" }, "/packs?window=week"],
    [
      "sort and window together",
      { sort: "popular", window: "month" },
      "/packs?sort=popular&window=month",
    ],
  ] satisfies [string, ListPacksFilters | undefined, string][])(
    "serializes the query string: %s",
    async (_label, filters, expectedUrl) => {
      vi.mocked(apiClient.get).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await packsClient.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith(expectedUrl);
    },
  );
});

describe("packsClient.delete", () => {
  it("delete() DELETEs /packs/:id", async () => {
    const deleteSpy = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ deleted: true });
    const result = await packsClient.delete("pack-1");
    expect(deleteSpy).toHaveBeenCalledWith("/packs/pack-1");
    expect(result).toEqual({ deleted: true });
  });
});

describe("packsClient.update", () => {
  it("update() PATCHes /packs/:id with the new pack body", async () => {
    const input = {
      title: PACK_A.title,
      description: PACK_A.description,
      coverTone: PACK_A.coverTone,
      language: "en" as Pack["language"],
      format: PACK_A.format,
      tags: PACK_A.tags,
      groups: PACK_A.groups,
      rounds: PACK_A.rounds,
    };
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue(PACK_A);

    const result = await packsClient.update("pack-a", input);

    expect(patchSpy).toHaveBeenCalledWith("/packs/pack-a", input);
    expect(result).toEqual(PACK_A);
  });
});

describe("packsClient.vote", () => {
  it("vote() POSTs to /packs/:id/vote with the given value", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ score: 1, likes: 1, dislikes: 0, myVote: 1 });
    const result = await packsClient.vote("pack-1", 1);
    expect(postSpy).toHaveBeenCalledWith("/packs/pack-1/vote", { value: 1 });
    expect(result).toEqual({ score: 1, likes: 1, dislikes: 0, myVote: 1 });
  });

  it("unvote() DELETEs /packs/:id/vote", async () => {
    const deleteSpy = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ score: 0, likes: 0, dislikes: 0, myVote: null });
    const result = await packsClient.unvote("pack-1");
    expect(deleteSpy).toHaveBeenCalledWith("/packs/pack-1/vote");
    expect(result).toEqual({ score: 0, likes: 0, dislikes: 0, myVote: null });
  });
});

describe("packsClient.moderationQueue", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it("calls GET /packs/moderation-queue with page/limit", async () => {
    await packsClient.moderationQueue({ page: 2, limit: 20 });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/packs/moderation-queue?page=2&limit=20",
    );
  });

  it("calls with no query string when no filters are given", async () => {
    await packsClient.moderationQueue();
    expect(apiClient.get).toHaveBeenCalledWith("/packs/moderation-queue");
  });

  it("returns the paginated envelope from the API", async () => {
    const envelope = { items: [PACK_A], total: 1, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    const result = await packsClient.moderationQueue();

    expect(result).toEqual(envelope);
  });
});

describe("packsClient.approve", () => {
  it("approve() POSTs to /packs/:id/approve with no body", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(PACK_A);
    const result = await packsClient.approve("pack-1");
    expect(postSpy).toHaveBeenCalledWith("/packs/pack-1/approve");
    expect(result).toEqual(PACK_A);
  });
});

describe("packsClient.reject", () => {
  it("reject() POSTs to /packs/:id/reject with the given reason", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(PACK_A);
    const result = await packsClient.reject(
      "pack-1",
      "Duplicate of an existing pack",
    );
    expect(postSpy).toHaveBeenCalledWith("/packs/pack-1/reject", {
      reason: "Duplicate of an existing pack",
    });
    expect(result).toEqual(PACK_A);
  });

  it("reject() POSTs an undefined reason when none is given", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(PACK_A);
    await packsClient.reject("pack-1");
    expect(postSpy).toHaveBeenCalledWith("/packs/pack-1/reject", {
      reason: undefined,
    });
  });
});
