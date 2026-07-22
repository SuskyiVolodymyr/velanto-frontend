import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { RankPlayScreen } from "./RankPlayScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/packs/pack-rank/play",
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

const RANK_BLIND_PACK: Pack = {
  id: "pack-rank",
  title: "Anime Openers, Ranked",
  description: "Place each pick blind into a growing ranked list.",
  coverTone: "#2b2a3a",
  language: "en",
  format: "rank_blind",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "Openers",
      items: [textItem("i1", "Kaikai Kitan"), textItem("i2", "Redo")],
    },
    {
      id: "g2",
      name: "Closers",
      items: [textItem("i3", "Silhouette")],
    },
  ],
  rounds: [
    {
      id: "r1",
      slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1", "i2"] }],
    },
    { id: "r2", slots: [{ groupId: "g2", mode: "manual", itemIds: ["i3"] }] },
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
      <RankPlayScreen pack={pack} />
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

describe("RankPlayScreen", () => {
  it("renders the current pick as an image when it is an image item", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    const imagePack: Pack = {
      ...RANK_BLIND_PACK,
      groups: [
        {
          id: "g1",
          name: "Openers",
          items: [
            {
              id: "i1",
              type: "image",
              title: "Poster",
              value: "media/item/p.webp",
            },
            textItem("i2", "Redo"),
          ],
        },
      ],
      rounds: [
        {
          id: "r1",
          slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1", "i2"] }],
        },
      ],
    };
    renderScreen(imagePack);

    const img = await screen.findByRole("img", { name: "Poster" });
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/p.webp",
    );
    vi.unstubAllEnvs();
  });

  // #221: this used to assert the play was NOT recorded. A signed-out visitor
  // can play any pack, so dropping their run silently made the pack's stats a
  // lie. The backend now takes an optional JWT and stores a null player.
  it("lets a signed-out visitor play and records the play", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);

    // No login wall — the ranking UI renders for anon.
    await screen.findByText("Kaikai Kitan");
    expect(
      screen.queryByText("You need to be logged in to play a pack."),
    ).toBeNull();

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));
    await user.click(
      await screen.findByRole("button", { name: "Next round →" }),
    );
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    // Anon play is recorded on the backend…
    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    expect(vi.mocked(playsClient.record).mock.calls[0][0]).toBe("pack-rank");
    // …and the local picks are stashed for the result screen.
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-rank")!),
      ).toEqual([
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i1",
          position: 0,
          drawIndex: 0,
        },
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i2",
          position: 1,
          drawIndex: 1,
        },
        {
          roundIndex: 1,
          groupId: "g2",
          itemId: "i3",
          position: 0,
          drawIndex: 0,
        },
      ]),
    );
  });

  // The last format still sharing its result as the whole `?p=` picks payload:
  // a rank_blind play records every drawn item with its placement AND its draw
  // index, so that URL is the longest of the five. ResultActions prefers a
  // short `?play=<id>` link whenever this id is stashed.
  it("stashes the recorded play id for a short share link", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));
    await user.click(
      await screen.findByRole("button", { name: "Next round →" }),
    );
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    await waitFor(() =>
      expect(sessionStorage.getItem("velanto:last-play-id:pack-rank")).toBe(
        "play-1",
      ),
    );
  });

  // The id is a nicety; the play still counts without it. A failed request must
  // not take the result screen down with it (#222 gates that screen on the
  // picks, which are stashed before the request goes out).
  it("survives a record request that never returns an id", async () => {
    vi.mocked(playsClient.record).mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));
    await user.click(
      await screen.findByRole("button", { name: "Next round →" }),
    );
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    // A failed record must not strand the player on the play screen — the
    // redirect waits for the request to settle, not to succeed.
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-rank/result"),
    );
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-rank")!),
    ).toHaveLength(3);
    expect(sessionStorage.getItem("velanto:last-play-id:pack-rank")).toBeNull();
  });

  it("shows the first item and one empty numbered slot per item in a manual-mode round", async () => {
    renderScreen(RANK_BLIND_PACK);

    expect(await screen.findByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
    expect(screen.getAllByText("Place here")).toHaveLength(2);
  });

  it("places the current item into the slot the player clicks, out of numeric order", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    // Place the first item ("Kaikai Kitan") into slot #2, not #1.
    await user.click(screen.getByText("#2"));

    expect(screen.getByText("Redo")).toBeInTheDocument(); // now showing the 2nd item
    const slot2 = screen.getByText("#2").closest("button")!;
    expect(slot2).toHaveTextContent("Kaikai Kitan");
  });

  // #338: the result screen replays the order items came at you, which is the
  // whole point of ranking blind. `position` cannot carry it — it says where an
  // item ended up — so the draw order is recorded separately.
  it("records where each item came in the draw, not just where it was placed", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    // First item shown goes LAST; second goes first.
    await user.click(screen.getByText("#2"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#1"));
    await user.click(
      await screen.findByRole("button", { name: "Next round →" }),
    );
    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    await waitFor(() => expect(playsClient.record).toHaveBeenCalled());
    expect(playsClient.record).toHaveBeenCalledWith("pack-rank", {
      picks: [
        // Placement order, as before — but i2 (shown second) took first place
        // and i1 (shown first) took second, which only drawIndex records.
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i2",
          position: 0,
          drawIndex: 1,
        },
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i1",
          position: 1,
          drawIndex: 0,
        },
        {
          roundIndex: 1,
          groupId: "g2",
          itemId: "i3",
          position: 0,
          drawIndex: 0,
        },
      ],
    });
  });

  it("shows a round-complete summary and advances to the next round", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));

    expect(await screen.findByText("Openers ranked")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Silhouette")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
  });

  // The recap between rounds is the same list the result screen shows, so what
  // a player reads mid-play matches what they get at the end — including where
  // each item came in the draw, which is the whole point of ranking blind.
  it("recaps the finished round with each item's draw position", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#2")); // shown first, placed second
    await screen.findByText("Redo");
    await user.click(screen.getByText("#1")); // shown second, placed first

    await screen.findByText("Openers ranked");
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Redo");
    expect(rows[0]).toHaveTextContent("Shown #2");
    expect(rows[1]).toHaveTextContent("Kaikai Kitan");
    expect(rows[1]).toHaveTextContent("Shown #1");
  });

  it("records the accumulated picks once, after the last round, then goes to the result", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));
    await user.click(
      await screen.findByRole("button", { name: "Next round →" }),
    );

    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    await waitFor(() => expect(playsClient.record).toHaveBeenCalledTimes(1));
    expect(playsClient.record).toHaveBeenCalledWith("pack-rank", {
      picks: [
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i1",
          position: 0,
          drawIndex: 0,
        },
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i2",
          position: 1,
          drawIndex: 1,
        },
        {
          roundIndex: 1,
          groupId: "g2",
          itemId: "i3",
          position: 0,
          drawIndex: 0,
        },
      ],
    });
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-rank")!),
      ).toEqual([
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i1",
          position: 0,
          drawIndex: 0,
        },
        {
          roundIndex: 0,
          groupId: "g1",
          itemId: "i2",
          position: 1,
          drawIndex: 1,
        },
        {
          roundIndex: 1,
          groupId: "g2",
          itemId: "i3",
          position: 0,
          drawIndex: 0,
        },
      ]),
    );
    // Placing the last item ends the play — there is no interstitial step
    // asking the player to click through to their own result.
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/packs/pack-rank/result"),
    );
    expect(screen.queryByRole("link", { name: /result/i })).toBeNull();
    expect(screen.getByText("Loading your results…")).toBeInTheDocument();
  });

  it("embeds the video for the current item when it is a youtube item", async () => {
    const videoPack: Pack = {
      ...RANK_BLIND_PACK,
      groups: [
        {
          id: "g1",
          name: "Openers",
          items: [
            {
              id: "i1",
              type: "youtube" as const,
              title: "Kaikai Kitan",
              value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            },
            textItem("i2", "Redo"),
          ],
        },
      ],
      rounds: [
        {
          id: "r1",
          slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1", "i2"] }],
        },
      ],
    };
    renderScreen(videoPack);

    // The current item is the youtube one — its video must be embedded, not
    // shown as bare title text.
    expect(await screen.findByTestId("youtube-card")).toBeInTheDocument();
    expect(screen.getByText("Kaikai Kitan")).toBeInTheDocument();
  });

  it("sizes a random-mode round's slots to the slot's draw count, not the full pool", async () => {
    const randomPack: Pack = {
      ...RANK_BLIND_PACK,
      groups: [
        {
          id: "g1",
          name: "Closers",
          items: [
            textItem("i1", "A"),
            textItem("i2", "B"),
            textItem("i3", "C"),
          ],
        },
      ],
      rounds: [
        { id: "r1", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
      ],
    };
    renderScreen(randomPack);

    await screen.findByText("Round 1 of 1");
    expect(screen.getAllByText("Place here")).toHaveLength(2);
  });
});
