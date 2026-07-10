import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateMetadata } from "./page";
import { getUserServer } from "@/src/features/author/get-user-server";
import type { PublicUserProfile } from "@/src/shared/types/user";

vi.mock("@/src/features/author/get-user-server", () => ({
  getUserServer: vi.fn(),
  getAuthorPacksServer: vi.fn(),
}));

const profile: PublicUserProfile = {
  id: "author-1",
  username: "quizmaster",
  bio: "I make packs",
  createdAt: "2026-01-01T00:00:00.000Z",
  followerCount: 3,
  isFollowedByMe: null,
};

function args(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("users/[id] generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a title, bio description, canonical, and OpenGraph for a found profile", async () => {
    vi.mocked(getUserServer).mockResolvedValue(profile);

    const meta = await generateMetadata(args("author-1"));

    expect(meta.title).toBe("quizmaster — Velanto");
    expect(meta.description).toBe("I make packs");
    expect(meta.alternates?.canonical).toContain("/users/author-1");
    expect(meta.openGraph?.url).toContain("/users/author-1");
  });

  it("falls back to a generic description when the profile has no bio", async () => {
    vi.mocked(getUserServer).mockResolvedValue({ ...profile, bio: null });

    const meta = await generateMetadata(args("author-1"));

    expect(meta.description).toContain("quizmaster");
    expect(meta.description).not.toBe("");
  });

  it("marks a missing user noindex with no canonical", async () => {
    vi.mocked(getUserServer).mockResolvedValue(null);

    const meta = await generateMetadata(args("missing"));

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBeUndefined();
  });

  it("emits no per-page metadata when the server fetch throws (does not claim not-found)", async () => {
    vi.mocked(getUserServer).mockRejectedValue(new Error("network"));

    const meta = await generateMetadata(args("author-1"));

    expect(meta.robots).toBeUndefined();
    expect(meta.title).toBeUndefined();
  });
});
