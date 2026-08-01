import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
import { baseRoomState } from "./test-fixtures";

function guessingState(overrides: Record<string, unknown> = {}) {
  const base = baseRoomState({
    phase: "guessing",
    mode: "guess_who",
    guessing: {
      labels: ["P1", "P2"],
      candidateUserIds: ["u1", "u2"],
      submitted: [],
    },
    ...overrides,
  });
  // u1 (Alice, the viewer in these tests) plays as P1, u2 (Bob) as P2.
  return {
    ...base,
    players: base.players.map((p) => ({
      ...p,
      label: p.userId === "u1" ? "P1" : "P2",
    })),
  };
}

/** The chips for one label. Each label is its own fieldset, so the roster is
 * rendered once per label and has to be scoped before clicking. */
function chipsFor(label: string) {
  return within(screen.getByRole("group", { name: new RegExp(label) }));
}

describe("GuessingPhaseScreen", () => {
  it("assigns by picking a player chip, and Submit unlocks once every label has one", async () => {
    const onSubmit = vi.fn();
    render(<GuessingPhaseScreen state={guessingState()} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();

    await userEvent.click(
      chipsFor("P1").getByRole("button", { name: "Alice" }),
    );
    await userEvent.click(chipsFor("P2").getByRole("button", { name: "Bob" }));
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith({ P1: "u1", P2: "u2" });
  });

  // Picking someone already assigned elsewhere IS the swap gesture, so the
  // chip stays offered on every label; the OTHER label is what gets cleared.
  it("keeps the mapping a bijection — claiming a player for P2 releases them from P1", async () => {
    render(<GuessingPhaseScreen state={guessingState()} onSubmit={vi.fn()} />);

    await userEvent.click(
      chipsFor("P1").getByRole("button", { name: "Alice" }),
    );
    await userEvent.click(
      chipsFor("P2").getByRole("button", { name: "Alice" }),
    );

    expect(
      chipsFor("P1").getByRole("button", { name: "Alice" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      chipsFor("P2").getByRole("button", { name: "Alice" }),
    ).toHaveAttribute("aria-pressed", "true");
    // ...and with only one label filled, there is nothing to submit yet.
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("clears a label when its own chip is picked again", async () => {
    render(<GuessingPhaseScreen state={guessingState()} onSubmit={vi.fn()} />);
    const alice = () => chipsFor("P1").getByRole("button", { name: "Alice" });

    await userEvent.click(alice());
    expect(alice()).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(alice());
    expect(alice()).toHaveAttribute("aria-pressed", "false");
  });

  it("counts how many labels are assigned", async () => {
    render(<GuessingPhaseScreen state={guessingState()} onSubmit={vi.fn()} />);
    expect(screen.getByText("0/2 assigned")).toBeInTheDocument();

    await userEvent.click(
      chipsFor("P1").getByRole("button", { name: "Alice" }),
    );
    expect(screen.getByText("1/2 assigned")).toBeInTheDocument();
  });

  // The count used to appear only AFTER you submitted, so until then the screen
  // said nothing about the room — you pressed Submit, nothing visible happened,
  // and the next thing you saw was the results.
  it("says how many have submitted before you have", () => {
    render(<GuessingPhaseScreen state={guessingState()} onSubmit={vi.fn()} />);
    expect(screen.getByText("0 / 2 have submitted")).toBeInTheDocument();
  });

  // You know your own label — you have watched your own picks all game — so
  // being made to place yourself is busywork, and the server no longer pays for
  // it either. It is filled in and fixed; you only guess the others.
  it("places you on your own label and does not let you move it", () => {
    render(
      <GuessingPhaseScreen
        state={guessingState()}
        currentUserId="u1"
        onSubmit={vi.fn()}
      />,
    );

    // P1 is the viewer's own label: already assigned, with nothing to press.
    const mine = screen.getByRole("group", { name: /P1/ });
    expect(within(mine).getByText("Alice")).toBeInTheDocument();
    expect(within(mine).queryAllByRole("button")).toHaveLength(0);
    // ...so only the OTHER label is still open, and one click completes it.
    expect(screen.getByText("1/2 assigned")).toBeInTheDocument();
  });

  // Placed on your own label, you cannot also be the answer to another one —
  // offering yourself there is offering a move that breaks the bijection.
  it("does not offer you as a candidate for anyone else's label", () => {
    render(
      <GuessingPhaseScreen
        state={guessingState()}
        currentUserId="u1"
        onSubmit={vi.fn()}
      />,
    );

    expect(chipsFor("P2").queryByRole("button", { name: "Alice" })).toBeNull();
    expect(
      chipsFor("P2").getByRole("button", { name: "Bob" }),
    ).toBeInTheDocument();
  });

  it("submits your own label along with the rest", async () => {
    const onSubmit = vi.fn();
    render(
      <GuessingPhaseScreen
        state={guessingState()}
        currentUserId="u1"
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(chipsFor("P2").getByRole("button", { name: "Bob" }));
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    // The server still validates a full bijection over every label.
    expect(onSubmit).toHaveBeenCalledWith({ P1: "u1", P2: "u2" });
  });

  // Once submitted the guess is final; the chips stay on screen so you can see
  // what you sent, but nothing on the page can change it.
  it("locks the chips and says who it is waiting on after submitting", () => {
    render(
      <GuessingPhaseScreen
        state={guessingState({
          myGuess: { P1: "u1", P2: "u2" },
          guessing: {
            labels: ["P1", "P2"],
            candidateUserIds: ["u1", "u2"],
            submitted: ["u1"],
          },
        })}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      chipsFor("P1").getByRole("button", { name: "Alice" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
    expect(screen.getByText("1 / 2 have submitted")).toBeInTheDocument();
  });

  // The phase has always had a server deadline, and the screen never drew it:
  // games ended mid-thought with no warning that a clock was even running.
  describe("the deadline countdown", () => {
    it("draws the time left as m:ss", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));
      try {
        render(
          <GuessingPhaseScreen
            // 5 minutes out, less a second, so the format is unambiguous.
            state={guessingState({ autoNextAt: Date.now() + 299_000 })}
            onSubmit={vi.fn()}
          />,
        );
        expect(screen.getByText("4:59")).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("floors at 0:00 rather than counting into negatives", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));
      try {
        render(
          <GuessingPhaseScreen
            state={guessingState({ autoNextAt: Date.now() - 5_000 })}
            onSubmit={vi.fn()}
          />,
        );
        expect(screen.getByText("0:00")).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("draws nothing when the room has no deadline pending", () => {
      render(
        <GuessingPhaseScreen
          state={guessingState({ autoNextAt: null })}
          onSubmit={vi.fn()}
        />,
      );
      expect(screen.queryByText(/^\d+:\d\d$/)).toBeNull();
    });
  });
});
