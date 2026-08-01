import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { FormatSection } from "./FormatSection";
import type { CreatePackValues } from "./create-pack.schema";
import type { PackFormat } from "@/src/shared/types/pack";

function baseValues(format: PackFormat = "save_one"): CreatePackValues {
  return {
    title: "",
    description: "",
    coverTone: "#2b2a3a",
    language: "en",
    format,
    tags: [],
    groups: [],
    rounds: [],
  };
}

function Harness({
  initial,
  locked,
}: {
  initial?: CreatePackValues;
  locked?: boolean;
}) {
  const methods = useForm<CreatePackValues>({
    defaultValues: initial ?? baseValues(),
  });
  return (
    <FormProvider {...methods}>
      <FormatSection locked={locked} />
    </FormProvider>
  );
}

describe("FormatSection", () => {
  it("renders the five format cards in the mock's order", () => {
    render(<Harness />);

    const buttons = screen.getAllByRole("button");
    const names = buttons.map((button) => button.textContent);

    // Order must be: save_one, sacrifice_one, 1v1, nxn, rank_blind.
    expect(names[0]).toContain("Save One");
    expect(names[1]).toContain("Sacrifice One");
    expect(names[2]).toContain("1v1");
    expect(names[3]).toContain("NxN");
    expect(names[4]).toContain("Rank Blind");
  });

  it("marks the currently-watched format as aria-pressed and the rest as not", () => {
    render(<Harness initial={baseValues("rank_blind")} />);

    expect(screen.getByRole("button", { name: /Rank Blind/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Save One/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("button", { name: /Sacrifice One/ }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /NxN/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /^1v1/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking a card sets the format form value", async () => {
    const user = userEvent.setup();
    render(<Harness initial={baseValues("save_one")} />);

    expect(screen.getByRole("button", { name: /NxN/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await user.click(screen.getByRole("button", { name: /NxN/ }));

    expect(screen.getByRole("button", { name: /NxN/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Save One/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  // Edit mode: formatHint says the format can't change once published, and
  // CreatePackForm sends the current format on every PATCH — locking the
  // picker is what keeps that copy honest and stops an edit from silently
  // reshaping the author's existing rounds via the family-switch effect.
  describe("locked (edit mode)", () => {
    it("does not change the format when a different, unselected card is clicked", async () => {
      const user = userEvent.setup();
      render(<Harness initial={baseValues("save_one")} locked />);

      await user.click(screen.getByRole("button", { name: /NxN/ }));

      expect(screen.getByRole("button", { name: /Save One/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: /NxN/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("natively disables every unselected card, but not the selected one", () => {
      render(<Harness initial={baseValues("save_one")} locked />);

      expect(
        screen.getByRole("button", { name: /Save One/ }),
      ).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /NxN/ })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /Sacrifice One/ }),
      ).toBeDisabled();
    });

    // The selected card stays natively enabled (so it renders un-dimmed and
    // legible), so it needs its own aria-disabled — otherwise a keyboard/AT
    // user tabbing to it would find an activatable control that's silently
    // a no-op.
    it("marks the selected card aria-disabled even though it isn't natively disabled", () => {
      render(<Harness initial={baseValues("save_one")} locked />);

      const selected = screen.getByRole("button", { name: /Save One/ });
      expect(selected).toHaveAttribute("aria-disabled", "true");
      expect(selected).not.toBeDisabled();
    });

    it("does not mark anything aria-disabled when not locked", () => {
      render(<Harness initial={baseValues("save_one")} />);

      expect(
        screen.getByRole("button", { name: /Save One/ }),
      ).not.toHaveAttribute("aria-disabled");
    });

    it("shows a tooltip explaining why, only while locked", () => {
      const { rerender } = render(<Harness initial={baseValues()} />);
      expect(
        screen.getByRole("button", { name: /Save One/ }),
      ).not.toHaveAttribute("title");

      rerender(<Harness initial={baseValues()} locked />);
      expect(screen.getByRole("button", { name: /Save One/ })).toHaveAttribute(
        "title",
        "Format can't change after publishing.",
      );
    });
  });

  // Mock (Create Pack.dc.html): every format has its own identity color
  // (hue), used to tint its icon badge always and its card's
  // background/border only once selected — not a single shared accent
  // across every card.
  describe("per-format hue identity (mock parity)", () => {
    it("shows a checkmark indicator only on the selected card", () => {
      render(<Harness initial={baseValues("rank_blind")} />);

      const checks = screen.getAllByTestId("format-selected-check");
      expect(checks).toHaveLength(1);
      expect(
        screen.getByRole("button", { name: /Rank Blind/ }),
      ).toContainElement(checks[0]);
    });

    it("tints each icon badge with the format's own hue, regardless of selection", () => {
      render(<Harness initial={baseValues("save_one")} />);

      // NxN isn't selected, but its icon badge still carries NxN's own pink
      // hue rather than the muted/gray treatment an unselected card used to get.
      expect(screen.getByTestId("format-icon-nxn")).toHaveStyle({
        backgroundColor: "rgba(255,92,192,.14)",
        color: "rgb(255,92,192)",
      });
      expect(screen.getByTestId("format-icon-save_one")).toHaveStyle({
        backgroundColor: "rgba(57,217,138,.14)",
        color: "rgb(57,217,138)",
      });
    });

    it("tints the selected card's border and background with its own hue", () => {
      render(<Harness initial={baseValues("sacrifice_one")} />);

      expect(screen.getByRole("button", { name: /Sacrifice One/ })).toHaveStyle(
        {
          borderColor: "rgba(255,90,90,.5)",
          backgroundColor: "rgba(255,90,90,.1)",
        },
      );
    });

    it("leaves unselected cards on the plain surface-card border/background, not hue-tinted", () => {
      render(<Harness initial={baseValues("sacrifice_one")} />);

      const saveOne = screen.getByRole("button", { name: /Save One/ });
      expect(saveOne.style.borderColor).toBe("");
      expect(saveOne.style.backgroundColor).toBe("");
    });
  });
});
