import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayRouter } from "@/src/features/play/PlayRouter";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/packs/pack/play",
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: {
    record: vi.fn().mockResolvedValue({ id: "play-1" }),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

// Two single-item-per-round rank_blind packs, distinguished only by id and
// item title — same format, same shape, so a missed remount reuses the
// SAME RankPlayScreen (and its usePlayResume) instance across the two.
function makeRankPack(id: string, itemTitle: string): Pack {
  return {
    id,
    title: id,
    description: "",
    coverTone: "#2b2a3a",
    language: "en",
    format: "rank_blind",
    tags: [],
    groups: [
      {
        id: "g1",
        name: "Pool",
        items: [{ id: "1", type: "text", title: itemTitle, value: itemTitle }],
      },
    ],
    rounds: [
      { id: "r1", slots: [{ groupId: "g1", mode: "manual", itemIds: ["1"] }] },
      { id: "r2", slots: [{ groupId: "g1", mode: "manual", itemIds: ["1"] }] },
    ],
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
}

const PACK_A = makeRankPack("pack-a", "Alpha Item");
const PACK_B = makeRankPack("pack-b", "Beta Item");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("PlayRouter across a pack change", () => {
  // Regression: velanto-frontend, reported live — a player who finished a
  // round on one pack, navigated to a DIFFERENT never-played pack, and
  // pressed "Continue" on the resume prompt ended up looking at the FIRST
  // pack's saved progress. `rerender` (same tree, new props — not a fresh
  // `render`) is the deterministic way to force React's worst case: reusing
  // the same component instance instead of unmounting, exactly what a client
  // -side navigation that doesn't force a remount would do.
  it("does not carry pack A's saved progress into pack B after a same-tree pack change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AuthProvider>
        <PlayRouter pack={PACK_A} />
      </AuthProvider>,
    );

    // Finish pack A's round 0, creating a real saved record for pack A.
    await screen.findByText("Alpha Item");
    await user.click(screen.getByText("#1"));
    await user.click(
      await screen.findByRole("button", { name: "Next round" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Round 2 of 2")).toBeInTheDocument(),
    );

    // Same render tree, new pack — the worst case for a missed remount.
    rerender(
      <AuthProvider>
        <PlayRouter pack={PACK_B} />
      </AuthProvider>,
    );

    // Pack B has never been played: no resume prompt, straight to round 1.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Round 1 of 2")).toBeInTheDocument();
    expect(await screen.findByText("Beta Item")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Item")).not.toBeInTheDocument();
  });
});
