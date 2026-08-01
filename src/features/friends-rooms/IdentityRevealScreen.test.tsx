import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { IdentityRevealScreen } from "./IdentityRevealScreen";
import { baseRoomState } from "./test-fixtures";
import { friendsRoomsClient } from "./friends-rooms-client";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./friends-rooms-client", () => ({
  friendsRoomsClient: { create: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

function revealState(overrides: Record<string, unknown> = {}) {
  return baseRoomState({
    phase: "finished",
    mode: "guess_who",
    endgame: { kind: "identity_reveal", mapping: { P1: "u1", P2: "u2" } },
    myGuess: { P1: "u1", P2: "u1" },
    ...overrides,
  });
}

describe("IdentityRevealScreen", () => {
  it("marks each of MY guesses green (correct) or red (wrong) against the true mapping", () => {
    render(<IdentityRevealScreen state={revealState()} />);

    const mine = within(screen.getByRole("region", { name: "Your guess" }));
    const rows = mine.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("P1");
    expect(rows[0].className).toMatch(/live|success/);
    expect(rows[1]).toHaveTextContent("P2");
    expect(rows[1].className).toMatch(/danger/);
    // A wrong row says who you actually named, not just that you were wrong.
    expect(mine.getByText("You said Alice")).toBeInTheDocument();
  });

  // The leaderboard is public — every score is derived from the mapping that
  // has just been shown to everyone. It replaced a placeholder note that stood
  // in while the wire carried no scores at all.
  it("ranks every player and crowns the top score", () => {
    render(
      <IdentityRevealScreen
        state={revealState({
          endgame: {
            kind: "identity_reveal",
            mapping: { P1: "u1", P2: "u2" },
            scores: { u1: 2, u2: 1 },
          },
        })}
      />,
    );

    const board = within(screen.getByRole("region", { name: "Leaderboard" }));
    const rows = board.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[0]).toHaveTextContent("2");
    expect(rows[1]).toHaveTextContent("Bob");

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(
      screen.getByText("Read the room best — 2 of 2 labels matched"),
    ).toBeInTheDocument();
  });

  // No tiebreak exists in this mode, so crowning whoever sorts first would
  // invent one. A shared top score is a shared win.
  it("names every winner when the top score is tied, and crowns nobody", () => {
    render(
      <IdentityRevealScreen
        state={revealState({
          endgame: {
            kind: "identity_reveal",
            mapping: { P1: "u1", P2: "u2" },
            scores: { u1: 1, u2: 1 },
          },
        })}
      />,
    );

    expect(screen.getByText(/Shared win/)).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  // Absent scores mean the game ended without a reveal, not zero for everyone
  // — so the board is omitted rather than drawn empty.
  it("omits the leaderboard when no scores came through", () => {
    render(<IdentityRevealScreen state={revealState()} />);

    expect(
      screen.queryByRole("region", { name: "Leaderboard" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  // "Play again" pointed at /packs/:id/play — the SOLO route. You finished a
  // game with three people and were dropped into a single-player run of the
  // same pack. It opens a new room over the same pack instead, which is what
  // playing again means from here.
  it("opens a new room rather than a solo game", async () => {
    vi.mocked(friendsRoomsClient.create).mockResolvedValue({
      id: "room-2",
    } as never);
    // The leaderboard — which carries these controls — needs scores.
    render(
      <IdentityRevealScreen
        state={revealState({
          endgame: {
            kind: "identity_reveal",
            mapping: { P1: "u1", P2: "u2" },
            scores: { u1: 1, u2: 2 },
          },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /play again/i }));

    expect(friendsRoomsClient.create).toHaveBeenCalledWith("pack-1");
    expect(push).toHaveBeenCalledWith("/rooms/room-2");
  });

  // A room can fail to open — you may already be in one, or the pack may have
  // been pulled. Falling back to the pack page beats stranding the player on a
  // dead button.
  it("falls back to the pack when the room cannot be opened", async () => {
    vi.mocked(friendsRoomsClient.create).mockRejectedValue(new Error("nope"));
    render(
      <IdentityRevealScreen
        state={revealState({
          endgame: {
            kind: "identity_reveal",
            mapping: { P1: "u1", P2: "u2" },
            scores: { u1: 1, u2: 2 },
          },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /play again/i }));

    expect(push).toHaveBeenCalledWith("/packs/pack-1");
  });

  // The way out lived INSIDE the leaderboard block, and the leaderboard only
  // renders when somebody scored. `scores` is keyed on players who SUBMITTED a
  // guess, so a game whose deadline fired with nobody guessing produced an
  // empty board — and a results screen with no way off it. This screen is also
  // the one terminal state that renders no room header, so there was nothing
  // else on the page to leave by.
  describe("the way out", () => {
    it("offers a way back even when nobody scored", () => {
      render(
        <IdentityRevealScreen
          state={revealState({
            endgame: {
              kind: "identity_reveal",
              mapping: { P1: "u1", P2: "u2" },
              scores: {},
            },
          })}
        />,
      );

      expect(
        screen.getByRole("link", { name: /back to pack/i }),
      ).toHaveAttribute("href", "/packs/pack-1");
      expect(
        screen.getByRole("button", { name: /play again/i }),
      ).toBeInTheDocument();
    });

    it("still offers it when the leaderboard is there", () => {
      render(
        <IdentityRevealScreen
          state={revealState({
            endgame: {
              kind: "identity_reveal",
              mapping: { P1: "u1", P2: "u2" },
              scores: { u1: 1, u2: 2 },
            },
          })}
        />,
      );

      expect(
        screen.getByRole("link", { name: /back to pack/i }),
      ).toHaveAttribute("href", "/packs/pack-1");
      expect(
        screen.getByRole("button", { name: /play again/i }),
      ).toBeInTheDocument();
    });

    // The same destination offered twice on one screen is a choice that isn't
    // one — the aside kept a duplicate of the header's link.
    it("offers the pack link exactly once", () => {
      render(<IdentityRevealScreen state={revealState()} />);

      expect(
        screen.getAllByRole("link", { name: /back to pack/i }),
      ).toHaveLength(1);
    });
  });
});
