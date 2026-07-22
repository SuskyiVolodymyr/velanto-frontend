import { describe, expect, it, beforeEach, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultScreen } from "./ResultScreen";
import { encodePicks } from "@/src/shared/lib/share-url";
import { playsClient } from "@/src/shared/lib/plays-client";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RankResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

// #243: ResultScreen fetches the results itself now, so they arrive through
// the client rather than as a prop. Mocking playsClient is what lets these
// tests keep asserting on a known aggregate — and it is also what proves the
// gate works: `expect(playsClient.getResults).not.toHaveBeenCalled()` is only
// meaningful because the fetch is reachable from here.
vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: { getResults: vi.fn(), record: vi.fn() },
}));

const PACK: Pack = {
  id: "pack-1",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  language: "en",
  format: "save_one",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [
        {
          id: "i1",
          type: "text",
          title: "Guren no Yumiya",
          value: "Guren no Yumiya",
        },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
      ],
    },
  ],
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

const RESULTS: PackResults = {
  packId: "pack-1",
  format: "save_one",
  totalPlays: 4,
  rounds: [
    {
      roundIndex: 0,
      items: [
        {
          itemId: "i1",
          itemTitle: "Guren no Yumiya",
          count: 3,
          percentage: 75,
        },
        { itemId: "i2", itemTitle: "Redo", count: 1, percentage: 25 },
      ],
    },
  ],
  topItems: [
    {
      itemId: "i1",
      itemTitle: "Guren no Yumiya",
      picked: 3,
      appeared: 4,
      percentage: 75,
    },
    { itemId: "i2", itemTitle: "Redo", picked: 1, appeared: 4, percentage: 25 },
  ],
};

/** Makes the client return `results` for the screen's own query. */
function seedResults(results: PackResults | RankResults) {
  vi.mocked(playsClient.getResults).mockResolvedValue(results);
}

beforeEach(() => {
  sessionStorage.clear();
  searchParams = new URLSearchParams();
  vi.mocked(playsClient.getResults).mockReset();
  // Default: reject loudly. A test that reaches the network without
  // seeding is asserting against results it never defined.
  vi.mocked(playsClient.getResults).mockRejectedValue(
    new Error("getResults called without seedResults()"),
  );
});

// #222 gates the breakdown on evidence that you played this pack. Tests about
// what the breakdown RENDERS have to establish that precondition first —
// otherwise they assert against the locked state and pass for the wrong reason.
function seedOwnPlay(
  picks: RecordedPick[] = [{ roundIndex: 0, groupId: "g1", itemId: "i1" }],
) {
  sessionStorage.setItem("velanto:last-play:pack-1", JSON.stringify(picks));
}

describe("ResultScreen", () => {
  // #336: the round is a recap of the slate you were shown, not a per-item
  // percentage list. The crowd figure moved to the ranking below it, where the
  // denominator is appearances rather than every play of the pack.
  it("shows the round you played with your pick marked", async () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-1",
      JSON.stringify([
        { roundIndex: 0, groupId: "g1", itemId: "i1", chosen: true },
        { roundIndex: 0, groupId: "g1", itemId: "i2", chosen: false },
      ]),
    );

    seedResults(RESULTS);
    render(<ResultScreen pack={PACK} />);

    expect(await screen.findByTestId("picked")).toHaveTextContent(
      "Guren no Yumiya",
    );
    // The item you passed over is shown too — that is the point of the rework.
    // Scoped to the round: the ranking below lists it as well.
    const round = screen.getByRole("group", { name: /2016/ });
    expect(within(round).getByText("Redo")).toBeInTheDocument();
    expect(screen.getByText(/4 plays recorded/)).toBeInTheDocument();
  });

  // #222: the product promise is that stats stay locked until you finish, so
  // nobody is influenced by the crowd. This used to assert the OPPOSITE — that
  // the aggregate showed to anyone who reached the URL — which is the bug.
  it("hides the community breakdown until you have played this pack", async () => {
    seedResults(RESULTS);
    render(<ResultScreen pack={PACK} />);

    expect(await screen.findByText(/Finish the pack/)).toBeInTheDocument();
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(screen.queryByText("25%")).not.toBeInTheDocument();
    expect(screen.queryByText("Guren no Yumiya")).not.toBeInTheDocument();
  });

  // The gate sits above the format branch, so it covers rank_blind too. Pinned
  // because that is a property of where the check lives, not of the check —
  // moving it below the branch would silently unlock one of the five formats.
  it("hides a rank_blind breakdown until you have played this pack", async () => {
    const rankPack: Pack = { ...PACK, format: "rank_blind" };
    const rankResults: RankResults = {
      packId: "pack-1",
      format: "rank_blind",
      totalPlays: 1,
      rounds: [
        {
          roundIndex: 0,
          items: [
            {
              itemId: "i1",
              itemTitle: "Guren no Yumiya",
              timesRanked: 1,
              averagePosition: 1,
              positionCounts: [1],
            },
          ],
        },
      ],
    };

    seedResults(rankResults);
    render(<ResultScreen pack={rankPack} />);

    expect(await screen.findByText(/Finish the pack/)).toBeInTheDocument();
    expect(screen.queryByText(/ranked 1x/)).not.toBeInTheDocument();
  });

  it("offers a way to play from the locked state", async () => {
    seedResults(RESULTS);
    render(<ResultScreen pack={PACK} />);

    expect(await screen.findByRole("link", { name: /Play/ })).toHaveAttribute(
      "href",
      "/packs/pack-1/play",
    );
  });

  // A shared result (?p=) is someone handing you their picks on purpose — the
  // gate must not break sharing, which is a deliberate feature.
  it("shows the breakdown for a shared result even though you have not played", async () => {
    searchParams = new URLSearchParams({
      p: encodePicks([{ roundIndex: 0, groupId: "g1", itemId: "i1" }]),
    });

    seedResults(RESULTS);
    render(<ResultScreen pack={PACK} />);

    // 75% comes from the pack-wide ranking, which a shared result also gets.
    expect(await screen.findByText("75%")).toBeInTheDocument();
  });

  it("links back to play the pack again once you have played", async () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-1",
      JSON.stringify([{ roundIndex: 0, groupId: "g1", itemId: "i1" }]),
    );

    seedResults(RESULTS);
    render(<ResultScreen pack={PACK} />);

    expect(
      await screen.findByRole("link", { name: "Play again" }),
    ).toHaveAttribute("href", "/packs/pack-1/play");
  });

  it("renders without crashing when the pack has no recorded plays yet", async () => {
    const emptyResults: PackResults = {
      packId: "pack-1",
      format: "save_one",
      totalPlays: 0,
      rounds: [
        {
          roundIndex: 0,
          items: [
            {
              itemId: "i1",
              itemTitle: "Guren no Yumiya",
              count: 0,
              percentage: 0,
            },
            { itemId: "i2", itemTitle: "Redo", count: 0, percentage: 0 },
          ],
        },
      ],
    };

    seedOwnPlay();
    seedResults(emptyResults);
    render(<ResultScreen pack={PACK} />);

    expect(await screen.findByText(/0 plays recorded/)).toBeInTheDocument();
    // Your own round still renders — it comes from your picks, not the
    // aggregate — and there is no ranking to show yet.
    expect(screen.getByTestId("picked")).toHaveTextContent("Guren no Yumiya");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("delegates to RankResultScreen for rank_blind results", async () => {
    const rankPack: Pack = { ...PACK, format: "rank_blind" };
    const rankResults: RankResults = {
      packId: "pack-1",
      format: "rank_blind",
      totalPlays: 1,
      rounds: [
        {
          roundIndex: 0,
          items: [
            {
              itemId: "i1",
              itemTitle: "Guren no Yumiya",
              timesRanked: 1,
              averagePosition: 1,
              positionCounts: [1],
            },
          ],
        },
      ],
    };

    seedOwnPlay();
    seedResults(rankResults);
    render(<ResultScreen pack={rankPack} />);

    expect(await screen.findByText(/avg 1.*ranked 1x/)).toBeInTheDocument();
  });

  // The approved/non-approved Share-button rule is owned by ResultActions.test.

  it("renders the sharer's picks and a shared-result note when opened via a ?p= link", async () => {
    searchParams = new URLSearchParams({
      p: encodePicks([{ roundIndex: 0, groupId: "g1", itemId: "i1" }]),
    });

    seedResults(RESULTS);
    render(<ResultScreen pack={PACK} />);

    expect(
      await screen.findByText(/viewing a shared result/i),
    ).toBeInTheDocument();
    // The sharer's pick is labelled "Pick", not "Your pick" — it isn't yours.
    expect(screen.getByTestId("picked")).toHaveTextContent("Guren no Yumiya");
    expect(screen.getByText("Pick")).toBeInTheDocument();
    expect(screen.queryByText("Your pick")).not.toBeInTheDocument();
  });

  describe("single-pool versus round", () => {
    const SP_PACK: Pack = {
      ...PACK,
      format: "nxn",
      groups: [
        {
          id: "pool",
          name: "Anime",
          items: [
            { id: "p1", type: "text", title: "Naruto", value: "Naruto" },
            { id: "p2", type: "text", title: "Luffy", value: "Luffy" },
            { id: "p3", type: "text", title: "Goku", value: "Goku" },
            { id: "p4", type: "text", title: "Ichigo", value: "Ichigo" },
          ],
        },
      ],
      rounds: [
        {
          id: "r1",
          slots: [
            { groupId: "pool", mode: "random", count: 2 },
            { groupId: "pool", mode: "random", count: 2 },
          ],
        },
      ],
    };

    const SP_RESULTS: PackResults = {
      packId: "pack-1",
      format: "nxn",
      totalPlays: 3,
      rounds: [
        {
          roundIndex: 0,
          items: [
            { itemId: "p1", itemTitle: "Naruto", count: 2, percentage: 66.7 },
            { itemId: "p2", itemTitle: "Luffy", count: 1, percentage: 50 },
            { itemId: "p3", itemTitle: "Goku", count: 1, percentage: 50 },
            { itemId: "p4", itemTitle: "Ichigo", count: 0, percentage: 0 },
          ],
        },
      ],
    };

    it("replays the two sides the viewer was shown, without percentages", async () => {
      // The viewer chose p1/p2 (a side); p3/p4 were the other side.
      seedOwnPlay([
        { roundIndex: 0, groupId: "pool", itemId: "p1", chosen: true },
        { roundIndex: 0, groupId: "pool", itemId: "p2", chosen: true },
        { roundIndex: 0, groupId: "pool", itemId: "p3", chosen: false },
        { roundIndex: 0, groupId: "pool", itemId: "p4", chosen: false },
      ]);
      seedResults(SP_RESULTS);
      render(<ResultScreen pack={SP_PACK} />);

      // nxn routes to NxNResultScreen now: a recap of the round you played,
      // both sides with their items, the one you took marked. The per-item
      // ranking this used to show is gone along with every other percentage —
      // an nxn matchup is a set against a set, so a per-pairing share would be
      // off one play forever (see NxNResultScreen).
      expect(await screen.findByText("Naruto")).toBeInTheDocument();
      expect(screen.getByTestId("picked")).toHaveTextContent("Naruto");
      expect(screen.getByTestId("dropped")).toHaveTextContent("Goku");
      expect(screen.queryByText(/%/)).toBeNull();
    });
  });
});
