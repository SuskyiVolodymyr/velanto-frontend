import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { HeadToHeadResultScreen } from "./HeadToHeadResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type {
  ItemTally,
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/packs/pack-1v1/result",
}));

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const PACK: Pack = {
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
  totalPlays: 4,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

// Round 1: Goku beat Vegeta (3 of 4 who saw it agreed). Round 2: Sasuke beat
// Naruto, and only this play has ever seen that pairing.
const OWN_PICKS: RecordedPick[] = [
  { roundIndex: 0, groupId: "gl", itemId: "i1", chosen: true },
  { roundIndex: 0, groupId: "gr", itemId: "i2", chosen: false },
  { roundIndex: 1, groupId: "gl", itemId: "i3", chosen: false },
  { roundIndex: 1, groupId: "gr", itemId: "i4", chosen: true },
];

function tally(n: number): ItemTally {
  return {
    itemId: `t${n}`,
    itemTitle: `Item ${n}`,
    picked: 30 - n,
    appeared: 30,
    percentage: 100 - n,
  };
}

const RESULTS: PackResults = {
  packId: "pack-1v1",
  format: "1v1",
  totalPlays: 4,
  rounds: [],
  matchups: [
    {
      itemAId: "i1",
      itemATitle: "Goku",
      itemBId: "i2",
      itemBTitle: "Vegeta",
      aWins: 3,
      bWins: 1,
      seen: 4,
    },
    {
      itemAId: "i3",
      itemATitle: "Naruto",
      itemBId: "i4",
      itemBTitle: "Sasuke",
      aWins: 0,
      bWins: 1,
      seen: 1,
    },
  ],
  topItems: Array.from({ length: 25 }, (_, i) => tally(i + 1)),
};

function renderScreen(overrides: Partial<PackResults> = {}) {
  return render(
    <HeadToHeadResultScreen
      pack={PACK}
      results={{ ...RESULTS, ...overrides }}
      ownPicks={OWN_PICKS}
      shared={false}
    />,
  );
}

describe("HeadToHeadResultScreen", () => {
  it("shows each matchup you played with the crowd's split for that exact pairing", () => {
    renderScreen();

    const matchups = screen.getAllByRole("group", { name: /matchup/i });
    expect(matchups).toHaveLength(2);

    // Round 1: you picked Goku, and 3 of the 4 plays that saw Goku vs Vegeta
    // agreed — so 75% sits with Goku and 25% with Vegeta.
    const first = within(matchups[0]);
    expect(first.getByText("Goku")).toBeInTheDocument();
    expect(first.getByText("Vegeta")).toBeInTheDocument();
    expect(first.getByText("75%")).toBeInTheDocument();
    expect(first.getByText("25%")).toBeInTheDocument();
  });

  it("marks the contender you picked as won and the other as lost", () => {
    renderScreen();

    const matchups = screen.getAllByRole("group", { name: /matchup/i });
    // Round 2: you picked Sasuke, so Naruto is the one that lost — the pick,
    // not the crowd, decides which card reads as the winner.
    const second = within(matchups[1]);
    expect(second.getByTestId("winner")).toHaveTextContent("Sasuke");
    expect(second.getByTestId("loser")).toHaveTextContent("Naruto");
  });

  it("keeps each contender on the side it was drawn on", () => {
    renderScreen();

    const matchups = screen.getAllByRole("group", { name: /matchup/i });
    // Round 1 was won by the LEFT contender, round 2 by the RIGHT one. Sorting
    // winner-first would put green on the left in both, and the row would stop
    // matching the matchup the player actually saw.
    expect(within(matchups[0]).getByTestId("winner")).toHaveAttribute(
      "data-side",
      "left",
    );
    expect(within(matchups[1]).getByTestId("winner")).toHaveAttribute(
      "data-side",
      "right",
    );
    // Left card is Naruto in round 2 even though Naruto lost.
    const secondRow = within(matchups[1]);
    expect(secondRow.getByTestId("loser")).toHaveTextContent("Naruto");
    expect(secondRow.getByTestId("loser")).toHaveAttribute("data-side", "left");
  });

  it("counts your own play when the aggregate has nothing for a pairing", () => {
    // Nothing counted for these pairings — a play whose record never landed,
    // or an aggregate fetched before it did. Treating that as zero rendered 0%
    // on BOTH sides, which cannot be true of a matchup someone just finished.
    renderScreen({ matchups: [] });

    const first = within(screen.getAllByRole("group", { name: /matchup/i })[0]);
    expect(first.getByTestId("winner")).toHaveTextContent("100%");
    expect(first.getByTestId("loser")).toHaveTextContent("0%");
    expect(first.getByText(/1 play/i)).toBeInTheDocument();
  });

  it("says how many plays saw a pairing, so a lone 100% is not read as a verdict", () => {
    renderScreen();

    const matchups = screen.getAllByRole("group", { name: /matchup/i });
    // The whole reason this counter exists: round 2's 100%/0% is one play.
    expect(within(matchups[1]).getByText(/1 play/i)).toBeInTheDocument();
    expect(within(matchups[0]).getByText(/4 plays/i)).toBeInTheDocument();
  });

  it("lists the top picked ten at a time, loading more on demand", async () => {
    const user = userEvent.setup();
    renderScreen();

    const table = screen.getByRole("table", { name: /top picked/i });
    const bodyRows = () => within(table).getAllByRole("row").slice(1); // drop the header row
    expect(bodyRows()).toHaveLength(10);
    expect(within(table).getByText("Item 1")).toBeInTheDocument();
    expect(within(table).queryByText("Item 11")).toBeNull();

    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(bodyRows()).toHaveLength(20);

    // 25 entries: the last press exhausts the list and the button goes away.
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(bodyRows()).toHaveLength(25);
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("shares a place between equal scores and skips the one they consumed", () => {
    // Two items on 90% off 27 picks tie for first, so the next is THIRD —
    // second is not awarded. A third item matches the percentage but not the
    // pick count, which is a different result and ranks on its own.
    const tie: ItemTally[] = [
      {
        itemId: "a",
        itemTitle: "Alpha",
        picked: 27,
        appeared: 30,
        percentage: 90,
      },
      {
        itemId: "b",
        itemTitle: "Beta",
        picked: 27,
        appeared: 30,
        percentage: 90,
      },
      {
        itemId: "c",
        itemTitle: "Gamma",
        picked: 9,
        appeared: 10,
        percentage: 90,
      },
      {
        itemId: "d",
        itemTitle: "Delta",
        picked: 1,
        appeared: 10,
        percentage: 10,
      },
    ];
    renderScreen({ topItems: tie });

    const rows = within(screen.getByRole("table", { name: /top picked/i }))
      .getAllByRole("row")
      .slice(1);
    expect(rows.map((row) => row.getAttribute("data-rank"))).toEqual([
      "1",
      "1",
      "3",
      "4",
    ]);
  });

  it("gives the top three podium outlines, following rank rather than row order", () => {
    const tie: ItemTally[] = [
      {
        itemId: "a",
        itemTitle: "Alpha",
        picked: 9,
        appeared: 10,
        percentage: 90,
      },
      {
        itemId: "b",
        itemTitle: "Beta",
        picked: 9,
        appeared: 10,
        percentage: 90,
      },
      {
        itemId: "c",
        itemTitle: "Gamma",
        picked: 5,
        appeared: 10,
        percentage: 50,
      },
    ];
    renderScreen({ topItems: tie });

    const rows = within(screen.getByRole("table", { name: /top picked/i }))
      .getAllByRole("row")
      .slice(1);
    // Both firsts are gold; the next row is third, so it takes BRONZE and
    // silver goes unawarded — the medal follows the place, not the position.
    expect(rows[0].querySelector("td")).toHaveClass("border-medal-gold");
    expect(rows[1].querySelector("td")).toHaveClass("border-medal-gold");
    expect(rows[2].querySelector("td")).toHaveClass("border-medal-bronze");
    // Fill as well as outline, and it REPLACES bg-surface rather than joining
    // it — cn() is a plain join, so two background classes would leave the
    // cascade to pick by stylesheet order.
    expect(rows[0].querySelector("td")).toHaveClass("bg-medal-gold/10");
    expect(rows[0].querySelector("td")).not.toHaveClass("bg-surface");
  });

  it("names contenders from the pack, not from the aggregate", () => {
    // The aggregate only knows a pairing once a play has been counted into it,
    // so a result fetched before this play landed has no row to read a title
    // from — which put raw item ids on screen.
    renderScreen({ matchups: [] });

    const first = within(screen.getAllByRole("group", { name: /matchup/i })[0]);
    expect(first.getByTestId("winner")).toHaveTextContent("Goku");
    expect(first.getByTestId("loser")).toHaveTextContent("Vegeta");
    expect(screen.queryByText("i1")).toBeNull();
  });

  it("explains the gap rather than rendering nothing when a play predates matchups", () => {
    // Plays recorded before velanto-frontend#333 name only the winning pool,
    // so there is no pairing to show and never will be. Silence would read as
    // a broken screen.
    render(
      <HeadToHeadResultScreen
        pack={PACK}
        results={{ ...RESULTS, matchups: [], topItems: [] }}
        ownPicks={[
          { roundIndex: 0, groupId: "gl" },
          { roundIndex: 1, groupId: "gr" },
        ]}
        shared={false}
      />,
    );

    expect(screen.queryByRole("group", { name: /matchup/i })).toBeNull();
    expect(screen.getByText(/no matchup breakdown/i)).toBeInTheDocument();
  });
});
