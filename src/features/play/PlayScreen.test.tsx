import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { PlayScreen } from "./PlayScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/packs/pack-a/play",
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

function youtubeItem(id: string, title: string, value: string) {
  return { id, type: "youtube" as const, title, value };
}

// A save_one pack whose single round shows exactly `count` candidates (one
// group, one manual slot), for asserting the candidate grid's column layout.
function packWithItemCount(count: number): Pack {
  return {
    ...SAVE_ONE_PACK,
    groups: [
      {
        id: "g1",
        name: "R1",
        items: Array.from({ length: count }, (_, i) =>
          textItem(String(i + 1), `Item ${i + 1}`),
        ),
      },
    ],
    rounds: [
      {
        id: "r1",
        slots: [
          {
            groupId: "g1",
            mode: "manual",
            itemIds: Array.from({ length: count }, (_, i) => String(i + 1)),
          },
        ],
      },
    ],
  };
}

const SAVE_ONE_PACK: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  language: "en",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [textItem("1", "Guren no Yumiya"), textItem("2", "Redo")],
    },
    {
      id: "g2",
      name: "2020",
      items: [textItem("3", "Silhouette")],
    },
  ],
  rounds: [
    {
      id: "r1",
      slots: [{ groupId: "g1", mode: "manual", itemIds: ["1", "2"] }],
    },
    { id: "r2", slots: [{ groupId: "g2", mode: "manual", itemIds: ["3"] }] },
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
      <PlayScreen pack={pack} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("PlayScreen", () => {
  // #221: this used to assert the play was NOT recorded. A signed-out visitor
  // can play any pack, so dropping their run silently made the pack's stats a
  // lie. The backend now takes an optional JWT and stores a null player.
  it("lets a signed-out visitor play and records the play", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);

    // No login wall — the play UI renders for anon.
    await screen.findByText("Guren no Yumiya");
    expect(
      screen.queryByText("You need to be logged in to play a pack."),
    ).toBeNull();

    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    // Anon play advances to the result page and stashes local picks…
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-a/result"),
    );
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toEqual([
      { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
      { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
      { roundIndex: 1, groupId: "g2", itemId: "3", chosen: true },
    ]);
    // …and is recorded on the backend, with no auth header of its own.
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", {
      picks: [
        { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
        { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
        { roundIndex: 1, groupId: "g2", itemId: "3", chosen: true },
      ],
    });
  });

  const NXN_PACK: Pack = {
    id: "pack-nxn",
    title: "Boys vs Girls",
    description: "Pick a side each round.",
    coverTone: "#2b2a3a",
    language: "en",
    format: "nxn",
    tags: ["Anime"],
    groups: [
      {
        id: "ca",
        name: "Boys",
        items: [textItem("1", "Naruto"), textItem("2", "Sasuke")],
      },
      {
        id: "cb",
        name: "Girls",
        items: [textItem("3", "Sakura"), textItem("4", "Hinata")],
      },
    ],
    rounds: [
      {
        id: "r1",
        slots: [
          { groupId: "ca", mode: "manual", itemIds: ["1", "2"] },
          { groupId: "cb", mode: "manual", itemIds: ["3", "4"] },
        ],
      },
      {
        id: "r2",
        slots: [
          { groupId: "ca", mode: "manual", itemIds: ["1", "2"] },
          { groupId: "cb", mode: "manual", itemIds: ["3", "4"] },
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

  it("renders nxn rounds as two side-by-side categories with a VS divider", async () => {
    renderScreen(NXN_PACK);

    expect(
      await screen.findByRole("button", { name: "Pick Boys" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pick Girls" }),
    ).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
  });

  it("keeps nxn's Next round disabled until a side is picked", async () => {
    const user = userEvent.setup();
    renderScreen(NXN_PACK);
    await screen.findByRole("button", { name: "Pick Boys" });

    expect(screen.getByRole("button", { name: "Next round →" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(screen.getByRole("button", { name: "Next round →" })).toBeEnabled();
  });

  it("advances through nxn rounds and records both sides' drawn items per round", async () => {
    const user = userEvent.setup();
    renderScreen(NXN_PACK);
    await screen.findByRole("button", { name: "Pick Boys" });

    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Round 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pick Girls" }));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    // No interstitial finished screen — it records and goes straight to results.
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-nxn/result"),
    );
    // Every drawn item on both sides, in slot order, `chosen` marking the side
    // the player took. Recording only the winning pool named the side but not
    // what was on it, so the result could never replay the matchup.
    expect(playsClient.record).toHaveBeenCalledWith("pack-nxn", {
      picks: [
        { roundIndex: 0, groupId: "ca", itemId: "1", chosen: true },
        { roundIndex: 0, groupId: "ca", itemId: "2", chosen: true },
        { roundIndex: 0, groupId: "cb", itemId: "3", chosen: false },
        { roundIndex: 0, groupId: "cb", itemId: "4", chosen: false },
        { roundIndex: 1, groupId: "ca", itemId: "1", chosen: false },
        { roundIndex: 1, groupId: "ca", itemId: "2", chosen: false },
        { roundIndex: 1, groupId: "cb", itemId: "3", chosen: true },
        { roundIndex: 1, groupId: "cb", itemId: "4", chosen: true },
      ],
    });
  });

  it("shows all of the round's candidates at once, with no reveal controls", async () => {
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    // Both items of round 1 are present immediately — no Show next/Show all step.
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show next" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Show all" })).toBeNull();
    expect(screen.queryByText(/Showing/)).toBeNull();

    // The round heading is an h2: PlayHeader owns the page's only h1 (the pack
    // title), and a second h1 here would flatten that hierarchy.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("2016");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("requires a selection before confirming", async () => {
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    expect(screen.getByRole("button", { name: "Next round →" })).toBeDisabled();
  });

  // The count→columns mapping is real layout logic: ≤4 in one row, 6 as two
  // rows of three, 8 as two rows of four.
  it.each([
    [4, "lg:grid-cols-4"],
    [6, "lg:grid-cols-3"],
    [8, "lg:grid-cols-4"],
  ])(
    "lays %i candidates out with the %s grid on wide screens",
    async (count, gridClass) => {
      renderScreen(packWithItemCount(count));
      await screen.findByText("Item 1");

      expect(screen.getByTestId("candidate-grid")).toHaveClass(gridClass);
    },
  );

  it("records every pick, stores them for the result page, and navigates when finished", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Silhouette")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    // No "all rounds done" screen — a loader shows while it records, then it
    // navigates straight to the result page.
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", {
      picks: [
        { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
        { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
        { roundIndex: 1, groupId: "g2", itemId: "3", chosen: true },
      ],
    });
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
      ).toEqual([
        { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
        { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
        { roundIndex: 1, groupId: "g2", itemId: "3", chosen: true },
      ]),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-a/result"),
    );
    // The running picks summary still lists the round picks.
    expect(screen.getByText("Saved so far")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.getByText("Silhouette")).toBeInTheDocument();
  });

  it("uses sacrifice-framed copy for the sacrifice_one format", async () => {
    const sacrificePack: Pack = { ...SAVE_ONE_PACK, format: "sacrifice_one" };
    renderScreen(sacrificePack);

    expect(
      await screen.findByText(
        "Pick the one you'd sacrifice. Check it below, then confirm.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a real YouTube player for a youtube-type item and selects it via its own pick control, not the video area", async () => {
    const user = userEvent.setup();
    const packWithVideo: Pack = {
      ...SAVE_ONE_PACK,
      groups: [
        {
          id: "g1",
          name: "2016",
          items: [
            youtubeItem(
              "v1",
              "Guren no Yumiya",
              "https://youtu.be/KsF_hdjWJjo",
            ),
            textItem("2", "Redo"),
          ],
        },
      ],
      rounds: [
        {
          id: "r1",
          slots: [{ groupId: "g1", mode: "manual", itemIds: ["v1", "2"] }],
        },
      ],
    };
    renderScreen(packWithVideo);
    await screen.findByText("Guren no Yumiya");

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toHaveAttribute(
      "src",
      "https://img.youtube.com/vi/KsF_hdjWJjo/mqdefault.jpg",
    );

    // Interacting with the video area itself must not select the item —
    // only the dedicated "Pick ..." control below it does.
    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );
    // Single-round pack → the confirm button is the finish/"see results" one.
    expect(
      screen.getByRole("button", { name: "See results →" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Pick Guren no Yumiya" }),
    );
    expect(screen.getByRole("button", { name: "See results →" })).toBeEnabled();
  });

  it("resets the selection when advancing to the next round", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    // Round 2 (the last round) starts with nothing selected.
    await screen.findByText("Silhouette");
    expect(
      screen.getByRole("button", { name: "See results →" }),
    ).toBeDisabled();
  });

  it("records the finished play exactly once", async () => {
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    await screen.findByRole("status");
    await waitFor(() => expect(playsClient.record).toHaveBeenCalledTimes(1));
    // Re-render must not trigger a second record (recordedRef guards it).
    await user.click(screen.getByText("Redo"));
    expect(playsClient.record).toHaveBeenCalledTimes(1);
  });

  // #222 made these picks the result screen's gate, so "only after the request
  // resolves" turned from a cosmetic guarantee into a lockout: the player who
  // just finished would reach a locked screen while the request was in flight.
  it("writes the last-play picks without waiting for the record request", async () => {
    let resolveRecord!: (value: { id: string }) => void;
    vi.mocked(playsClient.record).mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveRecord = resolve;
      }),
    );
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    await screen.findByRole("status");
    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    // Record still pending, picks already persisted.
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toEqual([
      { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
      { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
      { roundIndex: 1, groupId: "g2", itemId: "3", chosen: true },
    ]);

    resolveRecord({ id: "play-1" });
    // Resolving leaves them alone; it only releases the redirect.
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
      ).toHaveLength(3),
    );
  });

  // A failed record costs the pack a stat. Since #222 it must not also cost the
  // player their result screen — the picks are local evidence, independent of
  // whether the server accepted the play.
  it("still persists picks for the result page when recording the play fails", async () => {
    vi.mocked(playsClient.record).mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderScreen(SAVE_ONE_PACK);
    await screen.findByText("Guren no Yumiya");

    await user.click(screen.getByText("Redo"));
    await user.click(screen.getByRole("button", { name: "Next round →" }));
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("Silhouette"));
    await user.click(screen.getByRole("button", { name: "See results →" }));

    await screen.findByRole("status");
    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toEqual([
      { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
      { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
      { roundIndex: 1, groupId: "g2", itemId: "3", chosen: true },
    ]);
  });
});
