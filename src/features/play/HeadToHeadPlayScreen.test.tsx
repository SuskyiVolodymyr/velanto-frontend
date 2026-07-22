import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { HeadToHeadPlayScreen } from "./HeadToHeadPlayScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/packs/pack-1v1/play",
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

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

// 1v1 is now a two-slot "pick a side" format: two pools (sides) held constant
// across rounds, each drawing one item per round. Math.random is pinned to an
// identity shuffle in beforeEach, so random draws take items in authored order:
// round 1 is Goku vs Vegeta, round 2 is Naruto vs Sasuke.
const HEAD_TO_HEAD_PACK: Pack = {
  id: "pack-1v1",
  title: "Anime Face-Offs",
  description: "Pick a winner each round.",
  coverTone: "#2b2a3a",
  language: "en",
  format: "1v1",
  tags: ["Anime"],
  groups: [
    {
      id: "gl",
      name: "Left",
      items: [textItem("i1", "Goku"), textItem("i3", "Naruto")],
    },
    {
      id: "gr",
      name: "Right",
      items: [textItem("i2", "Vegeta"), textItem("i4", "Sasuke")],
    },
  ],
  rounds: [
    {
      id: "r1",
      slots: [
        { groupId: "gl", mode: "random", count: 1 },
        { groupId: "gr", mode: "random", count: 1 },
      ],
    },
    {
      id: "r2",
      slots: [
        { groupId: "gl", mode: "random", count: 1 },
        { groupId: "gr", mode: "random", count: 1 },
      ],
    },
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

function renderScreen(pack: Pack) {
  return render(
    <AuthProvider>
      <HeadToHeadPlayScreen pack={pack} />
    </AuthProvider>,
  );
}

/**
 * Choose a contender and commit it — 1v1 is select-then-confirm, like every
 * other format. `last` picks the confirm label, which reads as finishing the
 * pack on the final round.
 */
async function pickAndConfirm(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  { last = false }: { last?: boolean } = {},
) {
  await user.click(screen.getByRole("button", { name: `Pick ${name}` }));
  await user.click(
    screen.getByRole("button", {
      name: last ? "See results →" : "Next round →",
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Pin the draw shuffle to identity so random-slot draws come out in authored
  // order — makes the per-round matchups deterministic.
  vi.spyOn(Math, "random").mockReturnValue(0.999999);
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("HeadToHeadPlayScreen", () => {
  // #221: this used to assert the play was NOT recorded. A signed-out visitor
  // can play any pack, so dropping their run silently made the pack's stats a
  // lie. The backend now takes an optional JWT and stores a null player.
  it("lets a signed-out visitor play and records the play", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);

    // No login wall — the matchup UI renders for anon.
    await screen.findByText("Goku");
    expect(
      screen.queryByText("You need to be logged in to play a pack."),
    ).toBeNull();

    await pickAndConfirm(user, "Goku");
    await screen.findByText("Naruto");
    await pickAndConfirm(user, "Sasuke", { last: true });

    // Anon play is recorded on the backend…
    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    expect(vi.mocked(playsClient.record).mock.calls[0][0]).toBe("pack-1v1");
    // …and the local picks are stashed for the result screen.
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-1v1")!),
      ).toEqual([
        { roundIndex: 0, groupId: "gl", itemId: "i1", chosen: true },
        { roundIndex: 0, groupId: "gr", itemId: "i2", chosen: false },
        { roundIndex: 1, groupId: "gl", itemId: "i3", chosen: false },
        { roundIndex: 1, groupId: "gr", itemId: "i4", chosen: true },
      ]),
    );
  });

  it("records both contenders of a two-pool matchup, each under its own pool", async () => {
    // velanto-frontend#333: this used to record only the winning pool, so
    // which two items met was unrecoverable and per-matchup results were
    // impossible. Each contender carries the group it was DRAWN from — the
    // backend counts a side by its own group id plus `chosen`.
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");

    await pickAndConfirm(user, "Vegeta");
    await screen.findByText("Naruto");
    await pickAndConfirm(user, "Naruto", { last: true });

    await waitFor(() =>
      expect(playsClient.record).toHaveBeenCalledWith("pack-1v1", {
        picks: [
          { roundIndex: 0, groupId: "gl", itemId: "i1", chosen: false },
          { roundIndex: 0, groupId: "gr", itemId: "i2", chosen: true },
          { roundIndex: 1, groupId: "gl", itemId: "i3", chosen: true },
          { roundIndex: 1, groupId: "gr", itemId: "i4", chosen: false },
        ],
      }),
    );
  });

  it("records a single-pool matchup per item, chosen on the winner", async () => {
    // Both sides from ONE pool; identity shuffle draws i1 (Goku) on side A and
    // i2 (Vegeta) on side B. The winner can't be recorded as a group (both
    // sides share 'pool'), so it's recorded per item with a `chosen` flag.
    const singlePool: Pack = {
      ...HEAD_TO_HEAD_PACK,
      groups: [
        {
          id: "pool",
          name: "Anime",
          items: [textItem("i1", "Goku"), textItem("i2", "Vegeta")],
        },
      ],
      rounds: [
        {
          id: "r1",
          slots: [
            { groupId: "pool", mode: "random", count: 1 },
            { groupId: "pool", mode: "random", count: 1 },
          ],
        },
      ],
    };
    const user = userEvent.setup();
    renderScreen(singlePool);
    await screen.findByText("Goku");

    await pickAndConfirm(user, "Goku", { last: true });

    await waitFor(() =>
      expect(playsClient.record).toHaveBeenCalledWith("pack-1v1", {
        picks: [
          { roundIndex: 0, groupId: "pool", itemId: "i1", chosen: true },
          { roundIndex: 0, groupId: "pool", itemId: "i2", chosen: false },
        ],
      }),
    );
  });

  it("selects on click and only advances once the pick is confirmed", async () => {
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");

    // Every other format selects first and commits with a button; 1v1 used to
    // advance on the click itself, so a misclick was unrecoverable.
    const confirm = screen.getByRole("button", { name: "Next round →" });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Pick Goku" }));
    expect(screen.getByRole("button", { name: "Pick Goku" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Still on round 1 — the click chose a side, it did not commit it.
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();

    // A pick is changeable right up until it's confirmed.
    await user.click(screen.getByRole("button", { name: "Pick Vegeta" }));
    expect(screen.getByRole("button", { name: "Pick Goku" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Next round →" }));
    // Absorbed from the retired "advances immediately after picking" test: the
    // next matchup's own contenders are on screen, not the previous round's.
    expect(await screen.findByText("Naruto")).toBeInTheDocument();
    expect(screen.getByText("Sasuke")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
    // The new matchup starts unselected, so the button can't be double-fired.
    // Round 2 of 2 is the last, so the confirm reads as finishing the pack.
    expect(
      screen.getByRole("button", { name: "See results →" }),
    ).toBeDisabled();
  });

  it("labels the last matchup's confirm as finishing the pack", async () => {
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");

    await user.click(screen.getByRole("button", { name: "Pick Goku" }));
    expect(
      screen.getByRole("button", { name: "Next round →" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Naruto");

    await user.click(screen.getByRole("button", { name: "Pick Sasuke" }));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    // The label is the claim under test; that it actually finishes the pack is
    // proved by the redirect the two tests below assert.
    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
  });

  it("shows both items of the first matchup immediately", async () => {
    renderScreen(HEAD_TO_HEAD_PACK);

    expect(await screen.findByText("Goku")).toBeInTheDocument();
    expect(screen.getByText("Vegeta")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
  });

  it("shows the finished state with matchup history after the last pick, and records the play once", async () => {
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");
    await pickAndConfirm(user, "Goku");
    await screen.findByText("Naruto");
    await pickAndConfirm(user, "Sasuke", { last: true });

    await waitFor(() =>
      expect(playsClient.record).toHaveBeenCalledWith("pack-1v1", {
        picks: [
          { roundIndex: 0, groupId: "gl", itemId: "i1", chosen: true },
          { roundIndex: 0, groupId: "gr", itemId: "i2", chosen: false },
          { roundIndex: 1, groupId: "gl", itemId: "i3", chosen: false },
          { roundIndex: 1, groupId: "gr", itemId: "i4", chosen: true },
        ],
      }),
    );
    expect(playsClient.record).toHaveBeenCalledTimes(1);
  });

  it("goes straight to the result screen once the last pick is recorded", async () => {
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");
    await pickAndConfirm(user, "Goku");
    await screen.findByText("Naruto");
    await pickAndConfirm(user, "Sasuke", { last: true });

    // No interstitial "All matchups done" recap — the result screen already
    // shows the run, so the recap was a page in the way. Matches the
    // elimination formats, which have always redirected on finishing.
    expect(screen.queryByText(/All matchups done/i)).toBeNull();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-1v1/result"),
    );
  });

  it("waits for the record to settle before redirecting", async () => {
    // #222 gates the result screen on the stashed picks; leaving the play
    // screen before the request settles is what used to land a fast player on
    // a locked result.
    let settle: (value: { id: string }) => void = () => undefined;
    vi.mocked(playsClient.record).mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    const user = userEvent.setup();
    renderScreen(HEAD_TO_HEAD_PACK);
    await screen.findByText("Goku");
    await pickAndConfirm(user, "Goku");
    await screen.findByText("Naruto");
    await pickAndConfirm(user, "Sasuke", { last: true });

    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();

    settle({ id: "play-1" });
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-1v1/result"),
    );
  });
});
