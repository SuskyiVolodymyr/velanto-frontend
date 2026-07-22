import { describe, expect, it, beforeEach, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RankResultScreen } from "./RankResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { RankResults } from "@/src/shared/types/play-results";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

const RANK_PACK: Pack = {
  id: "pack-rank",
  title: "Anime Openers, Ranked",
  description: "Place each pick blind into a growing ranked list.",
  coverTone: "#2b2a3a",
  format: "rank_blind",
  language: "en",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "Openers",
      items: [
        {
          id: "i1",
          type: "text",
          title: "Kaikai Kitan",
          value: "Kaikai Kitan",
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

const RANK_RESULTS: RankResults = {
  packId: "pack-rank",
  format: "rank_blind",
  totalPlays: 2,
  rounds: [
    {
      roundIndex: 0,
      items: [
        {
          itemId: "i1",
          itemTitle: "Kaikai Kitan",
          timesRanked: 2,
          averagePosition: 1,
          positionCounts: [2, 0],
        },
        {
          itemId: "i2",
          itemTitle: "Redo",
          timesRanked: 2,
          averagePosition: 2,
          positionCounts: [0, 2],
        },
      ],
    },
  ],
};

// The screen takes ownPicks/shared as props since #243, so it reads neither
// sessionStorage nor the ?p= param. The next/navigation mock stays because
// ShareButton still reaches for the router.
beforeEach(() => {
  sessionStorage.clear();
});

describe("RankResultScreen", () => {
  it("sorts items by averagePosition (best first) and shows avg/timesRanked captions", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={null}
        shared={false}
      />,
    );

    const titles = screen
      .getAllByText(/Kaikai Kitan|Redo/)
      .map((el) => el.textContent);
    expect(titles).toEqual(["Kaikai Kitan", "Redo"]);
    expect(screen.getByText(/avg 1.*ranked 2x/)).toBeInTheDocument();
    expect(screen.getByText(/avg 2.*ranked 2x/)).toBeInTheDocument();
  });

  it("labels the round with its pool name, not 'Round N', when unnamed", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={null}
        shared={false}
      />,
    );
    expect(screen.getByText("Openers")).toBeInTheDocument();
    expect(screen.queryByText("Round 1")).not.toBeInTheDocument();
  });

  it("uses the author-given round name when the round has one", () => {
    const named: Pack = {
      ...RANK_PACK,
      rounds: [{ ...RANK_PACK.rounds[0], name: "Semifinals" }],
    };
    render(
      <RankResultScreen
        pack={named}
        results={RANK_RESULTS}
        ownPicks={null}
        shared={false}
      />,
    );
    expect(screen.getByText("Semifinals")).toBeInTheDocument();
  });

  it("highlights the player's own placement and shows an agreement count", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
        shared={false}
      />,
    );

    expect(
      screen.getByText(/You placed this #1.*1 other play agreed/),
    ).toBeInTheDocument();
  });

  // #338: a round you played reads as YOUR ranking, first place to last. The
  // crowd's average orders the fallback below, but it is not your result.
  it("orders a played round by the viewer's own placement", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        // The crowd puts Kaikai Kitan first; this player put Redo there.
        ownPicks={[
          { roundIndex: 0, groupId: "g1", itemId: "i1", position: 1 },
          { roundIndex: 0, groupId: "g1", itemId: "i2", position: 0 },
        ]}
        shared={false}
      />,
    );

    expect(
      screen.getAllByText(/Kaikai Kitan|Redo/).map((el) => el.textContent),
    ).toEqual(["Redo", "Kaikai Kitan"]);
  });

  it("shows where each item came in the draw", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={[
          // Shown second, ranked first — the pairing the marker exists for.
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
        ]}
        shared={false}
      />,
    );

    expect(screen.getByText("Shown #2")).toBeInTheDocument();
    expect(screen.getByText("Shown #1")).toBeInTheDocument();
  });

  it("says nothing about the draw for a play that never recorded it", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
        shared={false}
      />,
    );

    expect(screen.queryByText(/Shown #/)).toBeNull();
  });

  it("ranks the pack's podium finishes by first, second and third combined", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={{
          ...RANK_RESULTS,
          podium: [
            {
              itemId: "i1",
              itemTitle: "Kaikai Kitan",
              first: 2,
              second: 1,
              third: 0,
              total: 3,
            },
            {
              itemId: "i2",
              itemTitle: "Redo",
              first: 0,
              second: 1,
              third: 1,
              total: 2,
            },
          ],
        }}
        ownPicks={null}
        shared={false}
      />,
    );

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1); // drop the header
    expect(rows[0]).toHaveTextContent("Kaikai Kitan");
    expect(rows[0]).toHaveAttribute("data-rank", "1");
    expect(rows[1]).toHaveTextContent("Redo");
    expect(rows[1]).toHaveAttribute("data-rank", "2");
  });

  it("shows no podium table before anyone has reached one", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={{ ...RANK_RESULTS, podium: [] }}
        ownPicks={null}
        shared={false}
      />,
    );

    expect(screen.queryByRole("table")).toBeNull();
  });

  it("hides items that weren't in the player's own play for a round they played", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
        shared={false}
      />,
    );

    // The player ranked i1 but never saw i2 in their play — i2 is dropped
    // rather than shown with a "not in your play" note.
    expect(screen.getByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.queryByText("Redo")).not.toBeInTheDocument();
  });

  it("shows the full pool for a round the player never played", () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={null}
        shared={false}
      />,
    );

    // No recorded play for this pack → fall back to the aggregate pool so the
    // round isn't blank.
    expect(screen.getByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.queryByText(/You placed this/)).not.toBeInTheDocument();
  });

  it("renders without crashing when there are no recorded plays yet", () => {
    const emptyResults: RankResults = {
      packId: "pack-rank",
      format: "rank_blind",
      totalPlays: 0,
      rounds: [
        {
          roundIndex: 0,
          items: [
            {
              itemId: "i1",
              itemTitle: "Kaikai Kitan",
              timesRanked: 0,
              averagePosition: 0,
              positionCounts: [0, 0],
            },
            {
              itemId: "i2",
              itemTitle: "Redo",
              timesRanked: 0,
              averagePosition: 0,
              positionCounts: [0, 0],
            },
          ],
        },
      ],
    };

    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={emptyResults}
        ownPicks={null}
        shared={false}
      />,
    );

    expect(screen.getByText(/0 plays recorded/)).toBeInTheDocument();
  });

  // The approved/non-approved Share-button rule is owned by ResultActions.test.

  it("shows the shared-result note when opened via a ?p= link", async () => {
    render(
      <RankResultScreen
        pack={RANK_PACK}
        results={RANK_RESULTS}
        ownPicks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
        shared
      />,
    );
    expect(
      await screen.findByText(/viewing a shared result/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Placed #1/)).toBeInTheDocument();
    expect(screen.queryByText(/You placed this/)).not.toBeInTheDocument();
  });
});
