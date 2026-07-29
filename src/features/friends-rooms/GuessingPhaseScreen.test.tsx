import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
import { baseRoomState } from "./test-fixtures";

describe("GuessingPhaseScreen", () => {
  it("renders one assignment control per label, and Submit is disabled until every label has a distinct player", async () => {
    const onSubmit = vi.fn();
    render(
      <GuessingPhaseScreen
        state={baseRoomState({
          phase: "guessing",
          mode: "guess_who",
          guessing: {
            labels: ["P1", "P2"],
            candidateUserIds: ["u1", "u2"],
            submitted: [],
          },
        })}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("P1"), "u1");
    await userEvent.selectOptions(screen.getByLabelText("P2"), "u2");
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith({ P1: "u1", P2: "u2" });
  });

  it("assigning the same player to two labels is impossible — picking them for P2 removes them from P1's options", async () => {
    render(
      <GuessingPhaseScreen
        state={baseRoomState({
          phase: "guessing",
          mode: "guess_who",
          guessing: {
            labels: ["P1", "P2"],
            candidateUserIds: ["u1", "u2"],
            submitted: [],
          },
        })}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("P1"), "u1");
    await userEvent.selectOptions(screen.getByLabelText("P2"), "u1");
    // P1's own selection must have been cleared by the swap — its value can no
    // longer be u1 once u1 moved to P2.
    expect(screen.getByLabelText<HTMLSelectElement>("P1").value).not.toBe("u1");
  });
});
