import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoundsBulkBar, RoundsAddButton } from "./RoundsToolbar";

function renderBulkBar(
  over: Partial<Parameters<typeof RoundsBulkBar>[0]> = {},
) {
  const onApply = vi.fn();
  render(
    <RoundsBulkBar
      bulk={{
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 8,
        placeholder: "4",
        current: 2,
        counts: [2, 2],
        onApply,
      }}
      {...over}
    />,
  );
  return { onApply };
}

describe("RoundsBulkBar", () => {
  // Every round already shares the seeded value, so Apply starts out
  // disabled/"Applied" — typing a DIFFERENT number is what re-enables it
  // (mock: drift is judged against the live stepper value, not a stale
  // snapshot), and only then does clicking Apply fire onApply.
  it("applies the typed count once it differs from what every round already has", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <RoundsBulkBar
        bulk={{
          label: "Set all rounds to draw",
          applyLabel: "Set count for all rounds",
          min: 1,
          max: 8,
          placeholder: "4",
          current: 2,
          counts: [2, 2],
          onApply,
        }}
      />,
    );

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
    renderBulkBar({
      bulk: {
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 8,
        placeholder: "4",
        current: 5,
        counts: [5, 6],
        onApply: vi.fn(),
      },
    });

    expect(
      screen.getByRole("spinbutton", { name: "Set all rounds to draw" }),
    ).toHaveValue(5);
  });

  // Mock: once every round already agrees with the stepper's own value,
  // there's nothing left to apply — the button reads "Applied" and disables,
  // rather than staying an always-clickable "Set count for all rounds".
  it("shows a disabled 'Applied' state and the match hint when every round already agrees", () => {
    renderBulkBar();

    const applyButton = screen.getByRole("button", { name: "Applied" });
    expect(applyButton).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Set count for all rounds" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Every round uses this. Open a round to give it a different number.",
      ),
    ).toBeInTheDocument();
  });

  // Mock: once the rounds disagree with each other (so none of them can
  // match the seeded stepper value either), the Apply button becomes the
  // live "Set count for all rounds" action and the hint lists what's in play.
  it("shows the enabled apply action and the drift hint (with the varying counts) when rounds disagree", () => {
    renderBulkBar({
      bulk: {
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 8,
        placeholder: "4",
        current: 2,
        counts: [4, 2, 4],
        onApply: vi.fn(),
      },
    });

    const applyButton = screen.getByRole("button", {
      name: "Set count for all rounds",
    });
    expect(applyButton).not.toBeDisabled();
    expect(
      screen.getByText("Rounds currently vary (2, 4). Apply to reset them all."),
    ).toBeInTheDocument();
  });

  // Stepping (or typing) away from what every round shares re-enables Apply
  // immediately, before it's ever clicked — the mock judges drift against
  // the live stepper value, not the value at mount.
  it("re-enables Apply as soon as the stepper is nudged off what every round already shares", async () => {
    const user = userEvent.setup();
    renderBulkBar();

    expect(screen.getByRole("button", { name: "Applied" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Increase" }));

    expect(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    ).not.toBeDisabled();
  });

  it("steps the field up and down with the +/- buttons, clamped to min/max", async () => {
    const user = userEvent.setup();
    renderBulkBar({
      bulk: {
        label: "Set all rounds to draw",
        applyLabel: "Set count for all rounds",
        min: 1,
        max: 3,
        placeholder: "4",
        current: 3,
        counts: [3, 3],
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
    const onApply = vi.fn();
    render(
      <RoundsBulkBar
        bulk={{
          label: "Set all rounds to draw",
          applyLabel: "Set count for all rounds",
          min: 1,
          max: 8,
          placeholder: "4",
          current: 2,
          counts: [2, 3],
          onApply,
        }}
      />,
    );

    await user.clear(
      screen.getByRole("spinbutton", { name: "Set all rounds to draw" }),
    );
    // An empty field can't match every round's count either, so Apply is
    // still enabled — but clicking it must still be a no-op (see guard above).
    await user.click(
      screen.getByRole("button", { name: "Set count for all rounds" }),
    );

    expect(onApply).not.toHaveBeenCalled();
  });

  // 1v1 draws exactly one item per side, so there is nothing to bulk-set — it
  // says so rather than offering a control that can only take one value.
  it("shows a note instead of the controls when there is nothing to set", () => {
    render(<RoundsBulkBar bulk={undefined} note="Always 1 per side" />);

    expect(screen.getByText("Always 1 per side")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });
});

describe("RoundsAddButton", () => {
  it("adds a round", async () => {
    const user = userEvent.setup();
    const onAddRound = vi.fn();
    render(<RoundsAddButton addLabel="Add round" onAddRound={onAddRound} />);

    await user.click(screen.getByRole("button", { name: "Add round" }));

    expect(onAddRound).toHaveBeenCalledTimes(1);
  });

  it("renders as its own dashed full-width row", () => {
    render(<RoundsAddButton addLabel="Add round" onAddRound={vi.fn()} />);

    const addButton = screen.getByRole("button", { name: "Add round" });
    expect(addButton).toHaveClass("w-full", "border-dashed");
  });
});
