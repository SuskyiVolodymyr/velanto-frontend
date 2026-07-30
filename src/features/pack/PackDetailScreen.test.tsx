import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { describe, it, expect, vi } from "vitest";
import { PackDetailScreen } from "./PackDetailScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";
import type { AvailableMode } from "@/src/features/friends-rooms/room-types";

vi.mock("@/src/features/pack/VoteButtons", () => ({
  VoteButtons: () => <div>VoteButtons</div>,
}));
vi.mock("@/src/features/pack/CommentSection", () => ({
  CommentSection: () => <div>CommentSection</div>,
}));
vi.mock("@/src/features/pack/PackCreatorCard", () => ({
  PackCreatorCard: () => <div>PackCreatorCard</div>,
}));
// PackPlayButton is a client island with its own auth gating + tests; here we
// stand in a plain link so the screen's layout assertions stay focused.
vi.mock("@/src/features/pack/PackPlayButton", () => ({
  PackPlayButton: ({ packId }: { packId: string }) => (
    <a href={`/packs/${packId}/play`}>Play now</a>
  ),
}));
// The banner's author line is an auth-gated client island (own tests); stub it
// so PackCoverBanner (which renders the asserted title) stays real.
vi.mock("@/src/features/pack/PackBannerAuthor", () => ({
  PackBannerAuthor: () => <div>PackBannerAuthor</div>,
}));
// Auth-gated owner/moderator actions (Edit/Delete) — own tests in
// PackOwnerActions.test. Stub so it's not pulling in the auth context here, and
// echo its props so we can assert the screen wires it to this pack.
vi.mock("@/src/features/pack/PackOwnerActions", () => ({
  PackOwnerActions: ({
    packId,
    packAuthorId,
  }: {
    packId: string;
    packAuthorId: string;
  }) => <div>{`PackOwnerActions:${packId}:${packAuthorId}`}</div>,
}));

// Also an auth-context client island (see PackOwnerStatusBadge.test); stub it so
// this screen test doesn't need an AuthProvider.
vi.mock("@/src/features/pack/PackOwnerStatusBadge", () => ({
  PackOwnerStatusBadge: () => null,
}));
vi.mock("@/src/features/pack/PackRejectionReason", () => ({
  PackRejectionReason: () => null,
}));
// FriendsRoomEntry is an auth-gated client island (own tests in
// FriendsRoomEntry.test.tsx — useAuth() throws outside an AuthProvider).
// Stub it so this screen's own wiring assertion (does it render, with the
// right packId) stays independent of the auth context.
vi.mock("@/src/features/friends-rooms/FriendsRoomEntry", () => ({
  FriendsRoomEntry: ({ packId }: { packId: string }) => (
    <button type="button">{`Create room (${packId})`}</button>
  ),
}));
// ReportPackDialog is another auth-gated client island (own tests in
// ReportPackDialog.test.tsx). Stub it the same way.
vi.mock("@/src/features/pack/ReportPackDialog", () => ({
  ReportPackDialog: ({ packId }: { packId: string }) => (
    <button type="button">{`Report (${packId})`}</button>
  ),
}));

const BASE_PACK: Pack = {
  id: "p1",
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
      items: [
        { id: "i1", type: "text", title: "Opening A", value: "Opening A" },
      ],
    },
  ],
  rounds: [
    { id: "r1", slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1"] }] },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 3,
  dislikes: 1,
  myVote: null,
};

const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

const AVAILABLE_MODES: AvailableMode[] = [
  { mode: "claim", available: true, maxPlayers: 4 },
  {
    mode: "guess_who",
    available: false,
    maxPlayers: 0,
    reason: "Needs at least 5 playable rounds",
  },
];

describe("PackDetailScreen", () => {
  // ROOMS_DORMANT flipped to false in Task 31 — this locks in "the room
  // entry renders now that rooms are live" as an explicit, checked contract
  // (FriendsRoomEntry's own auth-gating/create/join behavior has its own
  // tests in FriendsRoomEntry.test.tsx; this screen only needs to prove it
  // mounts the component at all, wired to the right pack).
  it("renders the room entry now that rooms are live", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    expect(
      screen.getByRole("button", { name: /create room/i }),
    ).toBeInTheDocument();
  });

  it("renders the pack's title, description, and a Play link", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    expect(screen.getByText("Best Anime Openings")).toBeInTheDocument();
    expect(
      screen.getByText("Pick your favorite each round."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Play now" })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
  });

  it("lists each round as a chip, falling back to the group name when unnamed", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    expect(screen.getByText("2016")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
    // The full item titles are no longer listed on the pack page.
    expect(screen.queryByText("Opening A")).not.toBeInTheDocument();
  });

  it("shows the round's own name when it has one", () => {
    const named: Pack = {
      ...BASE_PACK,
      rounds: [
        {
          id: "r1",
          name: "Semifinals",
          slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1"] }],
        },
      ],
    };
    render(<PackDetailScreen pack={named} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    expect(screen.getByText("Semifinals")).toBeInTheDocument();
    // The round name replaces the group-name fallback.
    expect(screen.queryByText("2016")).not.toBeInTheDocument();
  });

  it("lists rounds (not raw groups) as chips for a versus pack", () => {
    const nxnPack: Pack = {
      ...BASE_PACK,
      format: "nxn",
      groups: [
        {
          id: "c1",
          name: "Category A",
          items: [{ id: "i2", type: "text", title: "Item X", value: "Item X" }],
        },
      ],
      rounds: [
        {
          id: "r1",
          slots: [
            { groupId: "c1", mode: "random", count: 1 },
            { groupId: "c1", mode: "random", count: 1 },
          ],
        },
      ],
    };
    render(<PackDetailScreen pack={nxnPack} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    // A multi-slot (versus) round with no name falls back to "Round N".
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    // The raw group/category names and item titles are not listed.
    expect(screen.queryByText("Category A")).not.toBeInTheDocument();
    expect(screen.queryByText("Item X")).not.toBeInTheDocument();
  });

  // #336: the elimination formats get the same ranking the versus ones do, in
  // place of the per-round breakdown — which divided by every play of the pack
  // rather than by the rounds an item was actually drawn into.
  it("ranks the items of an elimination pack instead of the per-round stats", () => {
    render(
      <PackDetailScreen
        pack={BASE_PACK}
        results={{
          ...RESULTS,
          topItems: [
            {
              itemId: "i1",
              itemTitle: "Opening A",
              picked: 3,
              appeared: 4,
              percentage: 75,
            },
          ],
        }}
        availableModes={AVAILABLE_MODES}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Most saved" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Player stats")).not.toBeInTheDocument();
  });

  it("names the ranking for what a sacrifice_one player actually did", () => {
    render(
      <PackDetailScreen
        pack={{ ...BASE_PACK, format: "sacrifice_one" }}
        results={{
          ...RESULTS,
          format: "sacrifice_one",
          topItems: [
            {
              itemId: "i1",
              itemTitle: "Opening A",
              picked: 3,
              appeared: 4,
              percentage: 75,
            },
          ],
        }}
        availableModes={AVAILABLE_MODES}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Most sacrificed" }),
    ).toBeInTheDocument();
  });

  // #345: rank_blind has no topItems — its pack-wide ranking is the podium, and
  // the page fell through to the per-round stats forever without it.
  it("ranks a rank_blind pack by its podium finishes", () => {
    render(
      <PackDetailScreen
        pack={{ ...BASE_PACK, format: "rank_blind" }}
        results={{
          packId: "p1",
          format: "rank_blind",
          totalPlays: 2,
          rounds: [],
          podium: [
            {
              itemId: "i1",
              itemTitle: "Opening A",
              first: 2,
              second: 1,
              third: 0,
              total: 3,
            },
          ],
        }}
        availableModes={AVAILABLE_MODES}
      />,
    );

    // PodiumTable is shared with the result screen's aside, where it was
    // rebuilt from a six-column <table> into the mock's flat list — it is a
    // real <ul> now, on this page too.
    expect(
      screen.getByRole("list", { name: "Podium finishes" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Player stats")).not.toBeInTheDocument();
  });

  it("falls back to the per-round stats until a rank_blind pack has a podium", () => {
    render(
      <PackDetailScreen
        pack={{ ...BASE_PACK, format: "rank_blind" }}
        results={{
          packId: "p1",
          format: "rank_blind",
          totalPlays: 0,
          rounds: [],
          podium: [],
        }}
        availableModes={AVAILABLE_MODES}
      />,
    );

    expect(screen.getByText("Player stats")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  // #355: a round whose pool is drawn at play time has no pool name to put on
  // its chip, and no author name either — so it says what it is.
  it("labels a random-pool round on its chip", () => {
    render(
      <PackDetailScreen
        pack={{
          ...BASE_PACK,
          rounds: [
            {
              id: "r1",
              slots: [{ groupMode: "random", mode: "random", count: 2 }],
            },
          ],
        }}
        results={RESULTS}
        availableModes={AVAILABLE_MODES}
      />,
    );

    expect(screen.getByText("Random pool")).toBeInTheDocument();
  });

  it("wires the owner/moderator actions to this pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    expect(screen.getByText("PackOwnerActions:p1:u1")).toBeInTheDocument();
  });

  it("shows a Share button for an approved pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} availableModes={AVAILABLE_MODES} />);
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("hides the Share button for a non-approved pack", () => {
    render(
      <PackDetailScreen
        pack={{ ...BASE_PACK, status: "pending" }}
        results={RESULTS}
        availableModes={AVAILABLE_MODES}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Share" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Play button for a normal pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} availableModes={AVAILABLE_MODES} />);

    expect(screen.getByRole("link", { name: "Play now" })).toBeInTheDocument();
  });
});
