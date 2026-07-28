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

    expect(
      screen.getByRole("button", { name: /Rank Blind/ }),
    ).toHaveAttribute("aria-pressed", "true");
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

      expect(screen.getByRole("button", { name: /Save One/ })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /NxN/ })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /Sacrifice One/ }),
      ).toBeDisabled();
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
});
