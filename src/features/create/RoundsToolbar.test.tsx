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
        current: 2,
        allMatch: true,
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

  // The field now shows the live current count (T4) instead of starting
  // blank, so typing a replacement clears it first.
  it("applies the typed count", async () => {
    const user = userEvent.setup();
    const { onApply } = renderToolbar();

    const field = screen.getByRole("spinbutton", {
      name: "Set all rounds to draw",
    });
    await user.clear(field);
    await user.type(field, "6");
    await user.click(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    );

    expect(onApply).toHaveBeenCalledWith(6);
  });

  it("seeds the field from the live current count", () => {
    renderToolbar({
      bulk: {
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 8,
        placeholder: "4",
        current: 5,
        allMatch: true,
        onApply: vi.fn(),
      },
    });

    expect(
      screen.getByRole("spinbutton", { name: "Set all rounds to draw" }),
    ).toHaveValue(5);
  });

  it("flags the apply button amber when the rounds have drifted apart", () => {
    renderToolbar({
      bulk: {
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 8,
        placeholder: "4",
        current: 2,
        allMatch: false,
        onApply: vi.fn(),
      },
    });

    expect(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    ).toHaveClass("border-status-pending/30");
  });

  it("steps the field up and down with the +/- buttons, clamped to min/max", async () => {
    const user = userEvent.setup();
    renderToolbar({
      bulk: {
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 3,
        placeholder: "4",
        current: 3,
        allMatch: true,
        onApply: vi.fn(),
      },
    });

    const field = screen.getByRole("spinbutton", {
      name: "Set all rounds to draw",
    });
    expect(field).toHaveValue(3);
    // Already at max — the + button is disabled.
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Decrease" }));
    await user.click(screen.getByRole("button", { name: "Decrease" }));
    expect(field).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });

  // The guard both editors used to carry a copy of. Applying "" would have set
  // every round's count to NaN, which reads back as an empty round.
  it("does nothing while the field is empty", async () => {
    const user = userEvent.setup();
    const { onApply } = renderToolbar();

    await user.clear(
      screen.getByRole("spinbutton", { name: "Set all rounds to draw" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    );

    expect(onApply).not.toHaveBeenCalled();
  });

  // #359: the row broke "Set count for all rounds" across three lines with room
  // to spare beside it, and Button's fixed height meant the extra lines spilled
  // out of its box. The group is one flex item whose own children wrap, so its
  // min-content width is tiny — without these it squeezes instead of letting
  // the parent's flex-wrap move it to its own line. The add-round button no
  // longer shares that row (it's now its own full-width dashed row, like
  // "+ Add pool"), so only the bulk group still needs the nowrap protection.
  it("keeps the bulk group's label and apply button on one line each", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    ).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("Set all rounds to draw")).toHaveClass(
      "whitespace-nowrap",
    );
    // The wrap-fix itself: shrink-0 on the group so the parent's flex-wrap
    // moves the whole group to its own line instead of squeezing it (#359).
    expect(screen.getByText("Set all rounds to draw").closest("div")).toHaveClass(
      "shrink-0",
    );
  });

  it("renders the add-round button as its own dashed full-width row", () => {
    renderToolbar();

    const addButton = screen.getByRole("button", { name: "Add round" });
    expect(addButton).toHaveClass("w-full", "border-dashed");
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
