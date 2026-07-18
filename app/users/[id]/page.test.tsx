import { describe, it, expect, vi, beforeEach } from "vitest";
import messages from "@/messages/en.json";
import { generateMetadata } from "./page";
import { getUserServer } from "@/src/features/author/get-user-server";
import type { PublicUserProfile } from "@/src/shared/types/user";

vi.mock("@/src/features/author/get-user-server", () => ({
  getUserServer: vi.fn(),
  getAuthorPacksServer: vi.fn(),
}));

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog (interpolating {args}) so titles/descriptions
// read the shipped copy.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () => (key: string, vals?: Record<string, unknown>) => {
      let out = (messages.pages as Record<string, string>)[key] ?? key;
      for (const [k, v] of Object.entries(vals ?? {}))
        out = out.replaceAll(`{${k}}`, String(v));
      return out;
    },
  ),
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

  // #235 + the Vercel-500 fix: profile links are the most-shared URLs on the
  // platform, and they previewed blank on every OG consumer while looking correct
  // on Twitter (which reads twitter-image.tsx). The card is now co-located at
  // app/users/[id]/opengraph-image.tsx (the metadata file convention), so the
  // page emits NO explicit og:image and lets Next merge the hashed card. The old
  // route-handler ImageResponse at /users/[id]/social-card 500'd on Vercel.
  // Asserting the ABSENCE of images is what proves we deferred to that route
  // rather than re-inheriting the wrong static site card — the disinherit trap.
  it("defers the og:image to the co-located opengraph-image route", async () => {
    vi.mocked(getUserServer).mockResolvedValue(profile);

    const meta = await generateMetadata(args("author-1"));

    expect(meta.openGraph?.images).toBeUndefined();
    // The rest of the OG block is still emitted — only the image is deferred.
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
