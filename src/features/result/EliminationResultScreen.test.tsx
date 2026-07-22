import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { EliminationResultScreen } from "./EliminationResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/packs/pack-1/result",
}));

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const PACK: Pack = {
  id: "pack-1",
  title: "Best Anime Openings",
  description: "Keep one each round.",
  coverTone: "#2b2a3a",
  language: "en",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      items: [
        textItem("1", "Guren no Yumiya"),
        textItem("2", "Redo"),
        textItem("3", "Silhouette"),
      ],
    },
  ],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "random", count: 3 }] }],
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

// Draw order, `chosen` on the one kept — the shape a play records since #336.
const OWN_PICKS: RecordedPick[] = [
  { roundIndex: 0, groupId: "g1", itemId: "1", chosen: false },
  { roundIndex: 0, groupId: "g1", itemId: "2", chosen: true },
  { roundIndex: 0, groupId: "g1", itemId: "3", chosen: false },
];

const RESULTS: PackResults = {
  packId: "pack-1",
  format: "save_one",
  totalPlays: 4,
  rounds: [],
  topItems: [
    {
      itemId: "2",
      itemTitle: "Redo",
      picked: 3,
      appeared: 4,
      percentage: 75,
    },
    {
      itemId: "1",
      itemTitle: "Guren no Yumiya",
      picked: 1,
      appeared: 4,
      percentage: 25,
    },
  ],
};

function renderScreen({
  pack = PACK,
  results = RESULTS,
  picks = OWN_PICKS,
}: {
  pack?: Pack;
  results?: PackResults;
  picks?: RecordedPick[] | null;
} = {}) {
  return render(
    <EliminationResultScreen
      pack={pack}
      results={results}
      ownPicks={picks}
      shared={false}
    />,
  );
}

describe("EliminationResultScreen", () => {
  it("shows every element the round drew, not only the one picked", () => {
    renderScreen();

    const round = within(screen.getByRole("group", { name: /2016/ }));
    expect(round.getByText("Guren no Yumiya")).toBeInTheDocument();
    expect(round.getByText("Redo")).toBeInTheDocument();
    expect(round.getByText("Silhouette")).toBeInTheDocument();
  });

  it("keeps the elements in the order they were drawn", () => {
    renderScreen();

    const round = within(screen.getByRole("group", { name: /2016/ }));
    expect(round.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("Guren no Yumiya"),
      expect.stringContaining("Redo"),
      expect.stringContaining("Silhouette"),
    ]);
  });

  it("marks the save_one pick as saved", () => {
    renderScreen();

    const picked = screen.getByTestId("picked");
    expect(picked).toHaveTextContent("Redo");
    expect(picked).toHaveAttribute("data-outcome", "saved");
  });

  it("marks the sacrifice_one pick as sacrificed", () => {
    renderScreen({
      pack: { ...PACK, format: "sacrifice_one" },
      results: { ...RESULTS, format: "sacrifice_one" },
    });

    expect(screen.getByTestId("picked")).toHaveAttribute(
      "data-outcome",
      "sacrificed",
    );
  });

  // Colour alone can't carry the pick — it's the only difference between the
  // two formats' screens, and a third of the way through a list of look-alike
  // titles is exactly where it matters.
  it("names the pick in text as well as colour", () => {
    renderScreen();

    expect(
      within(screen.getByTestId("picked")).getByText("Your pick"),
    ).toBeInTheDocument();
  });

  it("shows no crowd percentages beside the round's elements", () => {
    renderScreen();

    // The per-round figure was a share of ALL plays over ALL the pool's items,
    // so a rarely-drawn item was capped by how often the draw surfaced it. The
    // crowd stat lives in the top table, where the denominator is appearances.
    const round = screen.getByRole("group", { name: /2016/ });
    expect(within(round).queryByText(/%/)).toBeNull();
  });

  it("ranks the pack's items in the top table", () => {
    renderScreen();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Redo")).toBeInTheDocument();
    expect(within(table).getByText("75%")).toBeInTheDocument();
  });

  // Plays recorded before #336 name the winner and nothing else. There is no
  // slate to show around it and no backfill possible, so the round shows the
  // one item it knows about rather than an empty state.
  it("shows a winner-only play as a single marked element", () => {
    renderScreen({
      picks: [{ roundIndex: 0, groupId: "g1", itemId: "2" }],
    });

    const round = within(screen.getByRole("group", { name: /2016/ }));
    expect(round.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("picked")).toHaveTextContent("Redo");
  });

  it("falls back to a note when the play recorded no rounds at all", () => {
    renderScreen({ picks: [] });

    expect(screen.queryByRole("group", { name: /2016/ })).toBeNull();
    expect(screen.getByText(/no round breakdown/i)).toBeInTheDocument();
  });
});
