import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { packsClient } from "@/src/shared/lib/packs-client";
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

  it("requests with no query params when no filters are given", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list();

    expect(apiClient.get).toHaveBeenCalledWith("/packs");
  });

  it("forwards format and tags in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ format: "save_one", tags: ["Anime", "Music"] });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/packs?format=save_one&tags=Anime%2CMusic",
    );
  });

  it("forwards page and limit in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 50,
    });

    await packsClient.list({ page: 2, limit: 50 });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?page=2&limit=50");
  });

  it("forwards q in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ q: "anime" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?q=anime");
  });

  it("omits q from the query string when it is an empty string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ q: "" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs");
  });

  it("includes authorId in the query string when provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ authorId: "user-1" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?authorId=user-1");
  });

  it("omits sort and window from the query string when not provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list();

    expect(apiClient.get).toHaveBeenCalledWith("/packs");
  });

  it("includes sort in the query string when provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ sort: "popular" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?sort=popular");
  });

  it("includes window in the query string when provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ window: "week" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?window=week");
  });

  it("includes both sort and window in the query string when provided together", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await packsClient.list({ sort: "popular", window: "month" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/packs?sort=popular&window=month",
    );
  });
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
