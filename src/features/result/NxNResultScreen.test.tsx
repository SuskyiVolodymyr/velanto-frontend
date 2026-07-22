import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { NxNResultScreen } from "./NxNResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/packs/pack-nxn/result",
}));

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const PACK: Pack = {
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
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 3,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

// Side B (Girls) taken. Slot order, so side A's items come first.
const OWN_PICKS: RecordedPick[] = [
  { roundIndex: 0, groupId: "ca", itemId: "1", chosen: false },
  { roundIndex: 0, groupId: "ca", itemId: "2", chosen: false },
  { roundIndex: 0, groupId: "cb", itemId: "3", chosen: true },
  { roundIndex: 0, groupId: "cb", itemId: "4", chosen: true },
];

const RESULTS: PackResults = {
  packId: "pack-nxn",
  format: "nxn",
  totalPlays: 3,
  rounds: [],
};

function renderScreen(picks: RecordedPick[] | null = OWN_PICKS) {
  return render(
    <NxNResultScreen
      pack={PACK}
      results={RESULTS}
      ownPicks={picks}
      shared={false}
    />,
  );
}

describe("NxNResultScreen", () => {
  it("shows both sides of each round with every item that was on them", () => {
    renderScreen();

    const round = within(screen.getAllByRole("group", { name: /round/i })[0]);
    expect(round.getByText("Naruto")).toBeInTheDocument();
    expect(round.getByText("Sasuke")).toBeInTheDocument();
    expect(round.getByText("Sakura")).toBeInTheDocument();
    expect(round.getByText("Hinata")).toBeInTheDocument();
  });

  it("marks the side you took as picked and the other as dropped", () => {
    renderScreen();

    const round = within(screen.getAllByRole("group", { name: /round/i })[0]);
    // Side B was taken, and it keeps its DRAWN side (right) rather than being
    // reordered to the front — the row should look like the round you played.
    expect(round.getByTestId("picked")).toHaveAttribute("data-side", "right");
    expect(round.getByTestId("picked")).toHaveTextContent("Sakura");
    expect(round.getByTestId("dropped")).toHaveAttribute("data-side", "left");
    expect(round.getByTestId("dropped")).toHaveTextContent("Naruto");
  });

  it("gives every item its own container so a side reads as a list", () => {
    renderScreen();

    const picked = screen.getByTestId("picked");
    // Two items on the side, two containers — a side with several items ran
    // together as one block of text otherwise.
    expect(within(picked).getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows no percentages anywhere", () => {
    renderScreen();

    // nxn deliberately does NOT aggregate per matchup: a side of 8 vs a side of
    // 8 has C(N,8)² possible pairings, so a share would be off one play forever
    // (velanto-frontend#333). This screen is a recap of your own run.
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("explains the gap when a play predates item-level recording", () => {
    renderScreen([{ roundIndex: 0, groupId: "cb" }]);

    expect(screen.queryByRole("group", { name: /round/i })).toBeNull();
    expect(screen.getByText(/no matchup breakdown/i)).toBeInTheDocument();
  });
});
