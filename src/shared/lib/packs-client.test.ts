import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const PACK_A: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime", "Music"],
  groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
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
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await packsClient.list();

    expect(apiClient.get).toHaveBeenCalledWith("/packs");
  });

  it("forwards format and tags in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await packsClient.list({ format: "save_one", tags: ["Anime", "Music"] });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?format=save_one&tags=Anime%2CMusic");
  });

  it("forwards page and limit in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0, page: 2, limit: 50 });

    await packsClient.list({ page: 2, limit: 50 });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?page=2&limit=50");
  });

  it("forwards q in the query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await packsClient.list({ q: "anime" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?q=anime");
  });

  it("omits q from the query string when it is an empty string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await packsClient.list({ q: "" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs");
  });

  it("includes authorId in the query string when provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await packsClient.list({ authorId: "user-1" });

    expect(apiClient.get).toHaveBeenCalledWith("/packs?authorId=user-1");
  });
});
