import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoundsToolbar } from "./RoundsToolbar";

function renderToolbar(
  over: Partial<Parameters<typeof RoundsToolbar>[0]> = {},
) {
  const onAddRound = vi.fn();
  const onApply = vi.fn();
  render(
    <RoundsToolbar
      addLabel="Add round"
      onAddRound={onAddRound}
      bulk={{
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 8,
        placeholder: "4",
        onApply,
      }}
      {...over}
    />,
  );
  return { onAddRound, onApply };
}

describe("RoundsToolbar", () => {
  it("adds a round", async () => {
    const user = userEvent.setup();
    const { onAddRound } = renderToolbar();

    await user.click(screen.getByRole("button", { name: "Add round" }));

    expect(onAddRound).toHaveBeenCalledTimes(1);
  });

  it("applies the typed count", async () => {
    const user = userEvent.setup();
    const { onApply } = renderToolbar();

    await user.type(
      screen.getByRole("spinbutton", { name: "Set all rounds to draw" }),
      "6",
    );
    await user.click(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    );

    expect(onApply).toHaveBeenCalledWith(6);
  });

  // The guard both editors used to carry a copy of. Applying "" would have set
  // every round's count to NaN, which reads back as an empty round.
  it("does nothing while the field is empty", async () => {
    const user = userEvent.setup();
    const { onApply } = renderToolbar();

    await user.click(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    );

    expect(onApply).not.toHaveBeenCalled();
  });

  // #359: the row broke "Set count for all rounds" across three lines with room
  // to spare beside it, and Button's fixed height meant the extra lines spilled
  // out of its box. The group is one flex item whose own children wrap, so its
  // min-content width is tiny — without these it squeezes instead of letting
  // the parent's flex-wrap move it to its own line.
  it("keeps its label and buttons on one line each", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: "Add round" })).toHaveClass(
      "whitespace-nowrap",
    );
    expect(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    ).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("Set all rounds to draw")).toHaveClass(
      "whitespace-nowrap",
    );
  });

  // 1v1 draws exactly one item per side, so there is nothing to bulk-set — it
  // says so rather than offering a control that can only take one value.
  it("shows a note instead of the controls when there is nothing to set", () => {
    renderToolbar({ bulk: undefined, note: "Always 1 per side" });

    expect(screen.getByText("Always 1 per side")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Add round" }),
    ).toBeInTheDocument();
  });
});
