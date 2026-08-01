import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RelayInsertBoard } from "./RelayInsertBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("RelayInsertBoard", () => {
  it("on your turn, renders one target per FREE slot, named by rank", async () => {
    const onPlaceItem = vi.fn();
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1", "i2", "i3"],
            relayPlaced: ["i1", null, null],
            relayCurrentItemId: "i2",
            relayPlacements: [{ userId: "u1", itemId: "i1" }],
            turnUserId: "u1",
          },
        })}
        currentUserId="u1"
        onPlaceItem={onPlaceItem}
      />,
    );
    // Slot #1 holds A, so #2 and #3 are open. Each target carries its OWN
    // accessible name — a shared one leaves them indistinguishable to
    // screen-reader and voice-control users.
    const targets = screen.getAllByRole("button", { name: /place at rank/i });
    expect(targets).toHaveLength(2);
    await userEvent.click(
      screen.getByRole("button", { name: /place at rank 3/i }),
    );
    // Rank 3 is slot index 2 — a position past everything placed so far, which
    // insertion could never offer.
    expect(onPlaceItem).toHaveBeenCalledWith("i2", 2);
  });

  it("when it isn't your turn, slots are not rendered as buttons", () => {
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1"],
            relayPlaced: [null],
            relayCurrentItemId: "i1",
            relayPlacements: [],
            turnUserId: "u2",
          },
        })}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );
    // The slot is still DRAWN (the board keeps its shape for everyone) but is
    // not actionable while someone else is deciding.
    expect(
      screen.queryByRole("button", { name: /place at rank/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the current item awaiting placement", () => {
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1", "i2"],
            relayPlaced: [null, null],
            relayCurrentItemId: "i1",
            relayPlacements: [],
            turnUserId: "u1",
          },
        })}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );
    // getAllByText, not getByText: the turn-holder's UserAvatar fallback
    // initial ("A" for Alice) and this item's own title ("A") coincide.
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });

  const YOUTUBE = {
    id: "y1",
    title: "Vandread — Trust",
    type: "youtube" as const,
    value: "https://youtu.be/zVgKnfN9i34?t=44",
  };

  function relayState(overrides: Record<string, unknown> = {}) {
    return baseRoomState({
      mode: "relay",
      packFormat: "rank_blind",
      round: {
        index: 0,
        name: "",
        items: [YOUTUBE, ITEM("i2", "B")],
        claims: {},
        survivorItemId: null,
        relayOrder: ["y1", "i2"],
        relayPlaced: [null, null],
        relayCurrentItemId: "y1",
        relayPlacements: [],
        turnUserId: "u1",
        ...(overrides.round as object satisfies object | undefined),
      },
    });
  }

  // The current item's media was a hardcoded gradient block — it never looked
  // at the item at all, so a pack of music videos was placed by title alone
  // while every other board played them.
  it("plays the current item's video", () => {
    render(
      <RelayInsertBoard
        state={relayState()}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /play video preview/i }),
    ).toBeInTheDocument();
  });

  // The board used to be built by INSERTION, so with nothing placed there was
  // exactly one position on offer — no ranking decision at all — drawn as a 2px
  // hairline whose "+" only appeared on hover.
  it("opens every slot from the very first placement", () => {
    render(
      <RelayInsertBoard
        state={relayState()}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );

    // One target per slot, from the very first placement — the whole board is
    // open, not just a single insertion point.
    const targets = screen.getAllByRole("button", { name: /place at rank/i });
    expect(targets).toHaveLength(2);
    for (const target of targets) {
      expect(target.className).toMatch(/border-dashed/);
      expect(target).toHaveTextContent(/place/i);
    }
  });

  it("still places the item when that target is clicked", async () => {
    const onPlaceItem = vi.fn();
    render(
      <RelayInsertBoard
        state={relayState()}
        currentUserId="u1"
        onPlaceItem={onPlaceItem}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /place at rank 2/i }),
    );

    // The LAST slot, with nothing placed yet.
    expect(onPlaceItem).toHaveBeenCalledWith("y1", 1);
  });
});
