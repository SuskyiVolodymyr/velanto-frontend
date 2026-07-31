import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRevealBoard } from "./GuessWhoRevealBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("GuessWhoRevealBoard", () => {
  it("shows this round's fresh reveal — every label's pick, resolved to the item title", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 1,
            name: "Round 2",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i3", "Tacos")],
              picks: { P1: ["i3"], P2: ["i3"] },
            },
            {
              kind: "reveal",
              index: 1,
              name: "Round 2",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              picks: { P1: ["i1"], P2: ["i2"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );
    // The history table renders both rounds, with each label's choice resolved
    // to a title, never a raw item id.
    expect(screen.getAllByText("Pizza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tacos").length).toBeGreaterThan(0);
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
  });

  // The round closed with only a table of titles, so you never saw the items
  // you had just been looking at, and nothing said how many people converged
  // on one. The marks are deliberately faceless: they arrive together, once
  // everyone is locked in, and carry no label — the whole game is deducing who
  // is who, and an avatar or a letter here would hand that over.
  it("marks the closed round's own cards with a faceless chip per pick", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          players: [
            { userId: "u1", username: "Alice" },
            { userId: "u2", username: "Bob" },
          ].map((p, i) => ({
            ...p,
            avatarKey: null,
            seat: i,
            connected: true,
            ready: true,
            next: false,
            claimedItemId: null,
          })),
          round: {
            index: 0,
            name: "Round 1",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              picks: { P1: ["i1"], P2: ["i1"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );

    // Both labels took Pizza, so its card carries two marks; Sushi carries none.
    expect(screen.getByLabelText("Picked by 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Picked by 0")).toBeNull();
    // Nothing on the cards names a player or their label.
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
  });
});
