import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
import { baseRoomState } from "./test-fixtures";

function guessingState(overrides: Record<string, unknown> = {}) {
  return baseRoomState({
    phase: "guessing",
    mode: "guess_who",
    guessing: {
      labels: ["P1", "P2"],
      candidateUserIds: ["u1", "u2"],
      submitted: [],
    },
    ...overrides,
  });
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
});
