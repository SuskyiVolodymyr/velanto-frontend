import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRoundBoard } from "./GuessWhoRoundBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

const YOUTUBE_ITEM = {
  id: "y1",
  title: "Silhouette",
  type: "youtube" as const,
  value: "https://youtu.be/zVgKnfN9i34?t=44",
};

describe("GuessWhoRoundBoard", () => {
  // Guess-who's board wrote its own bare title button and rendered no media at
  // all, so a pack of music videos was a list of names — you were picking from
  // titles while every other mode played the video.
  it("pick mode: plays a youtube option's video, like every other board", () => {
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [YOUTUBE_ITEM, ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["y1", "i2"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /play video preview/i }),
    ).toBeInTheDocument();
  });

  // The picks are live now: a label's choice marks its card the moment it
  // lands, so the round is watchable while people choose. The letter is all
  // that shows — which real player holds it is the deduction the mode is for.
  it("pick mode: marks a card with the label that picked it, mid-round", () => {
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          labels: ["P1", "P2", "P3"],
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: ["u2"],
            picks: { P2: ["i1"] },
          },
        })}
        currentUserId="u1"
        onPick={vi.fn()}
      />,
    );

    const pizza = screen.getByRole("button", { name: /pick pizza/i });
    expect(within(pizza).getByText("P2")).toBeInTheDocument();
    const sushi = screen.getByRole("button", { name: /pick sushi/i });
    expect(within(sushi).queryByText("P2")).toBeNull();
  });

  it("pick mode: clicking an option locks it in and calls onPick once", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={onPick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pizza/i }));
    expect(onPick).toHaveBeenCalledWith(["i1"]);
  });

  it("pick mode: the clicked option shows as selected WITHOUT any myLastSelection prop", async () => {
    // Regression guard: the real dispatcher (RoomRoundBoard) never passes
    // `myLastSelection`, so a test that supplies it cannot prove the player
    // sees anything happen when they click. Nothing is passed here on
    // purpose — this is the actual production wiring.
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={vi.fn()}
      />,
    );
    const pizza = screen.getByRole("button", { name: /pizza/i });
    expect(pizza).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(pizza);
    expect(pizza).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /sushi/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("pick mode: once locked in, the board shows YOUR pick highlighted and stops taking further clicks", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: ["u1"],
          },
        })}
        currentUserId="u1"
        myLastSelection={["i1"]}
        onPick={onPick}
      />,
    );
    // Inert once locked in, so the badge — not aria-pressed — is what says
    // which one you sent.
    const pizza = screen.getByRole("group", { name: "Pizza" });
    expect(within(pizza).getByText("Locked in")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sushi/i })).toBeNull();
  });

  it("rank mode: placing each revealed item into a slot submits the full ranking", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "rank",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={onPick}
      />,
    );
    // One item is revealed at a time and dropped into a numbered slot, so the
    // submitted ranking is the board's order rather than the click order.
    const slot = (rank: number) =>
      screen.getByRole("button", { name: new RegExp(`rank ${rank}`, "i") });
    await userEvent.click(slot(1)); // Pizza -> #1
    await userEvent.click(slot(2)); // Sushi -> #2
    expect(onPick).toHaveBeenLastCalledWith(["i1", "i2"]);
  });

  // A 1v1 round IS a matchup, and it was drawn as two cards in a three-column
  // grid — two thirds of the width, no relationship shown between them. Solo
  // play has always drawn this format as a versus pair.
  describe("a 1v1 round", () => {
    function pairState() {
      return baseRoomState({
        mode: "guess_who",
        packFormat: "1v1",
        round: {
          index: 0,
          name: "Solo tracks",
          items: [ITEM("i1", "Lover"), ITEM("i2", "Contradicting")],
          claims: {},
          survivorItemId: null,
          optionIds: ["i1", "i2"],
          actionKind: "pick",
          lockedIn: [],
        },
      });
    }

    it("puts a VS between the two contenders", () => {
      render(
        <GuessWhoRoundBoard
          state={pairState()}
          currentUserId="u1"
          onPick={vi.fn()}
        />,
      );

      expect(screen.getByText("VS", { exact: true })).toBeInTheDocument();
    });

    it("still picks the option that was clicked", async () => {
      const onPick = vi.fn();
      render(
        <GuessWhoRoundBoard
          state={pairState()}
          currentUserId="u1"
          onPick={onPick}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: /lover/i }));
      expect(onPick).toHaveBeenCalledWith(["i1"]);
    });

    it("draws no VS for a format whose round is not a matchup", () => {
      render(
        <GuessWhoRoundBoard
          state={baseRoomState({
            mode: "guess_who",
            packFormat: "save_one",
            round: {
              index: 0,
              name: "",
              // Two drawn items is not a versus — save_one just drew a small
              // round, and a VS would claim a relationship it does not have.
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              claims: {},
              survivorItemId: null,
              optionIds: ["i1", "i2"],
              actionKind: "pick",
              lockedIn: [],
            },
          })}
          currentUserId="u1"
          onPick={vi.fn()}
        />,
      );

      expect(screen.queryByText("VS", { exact: true })).toBeNull();
    });
  });
});
