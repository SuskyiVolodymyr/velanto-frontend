import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Text } from "./Text";

/** The colour utilities Text's variants emit, one per variant. */
const COLOR_CLASSES = [
  "text-foreground",
  "text-foreground-secondary",
  "text-foreground-tertiary",
  "text-danger",
];

function colorClassesOn(el: HTMLElement): string[] {
  return el.className.split(/\s+/).filter((c) => COLOR_CLASSES.includes(c));
}

describe("Text", () => {
  it("applies the body colour by default", () => {
    render(<Text>hello</Text>);
    expect(colorClassesOn(screen.getByText("hello"))).toEqual([
      "text-foreground",
    ]);
  });

  it("applies the danger colour for error text", () => {
    render(<Text variant="danger">bad</Text>);
    expect(colorClassesOn(screen.getByText("bad"))).toEqual(["text-danger"]);
  });

  /**
   * The bug this variant exists to kill (#236).
   *
   * `cn()` is a plain join, not tailwind-merge, so passing the colour in via
   * className emitted BOTH `text-foreground` (from the default variant) and
   * `text-danger`.
   * Two utilities of equal specificity: the cascade picks by stylesheet order,
   * not class-attribute order, and `text-foreground` wins. Measured in a real
   * browser: `text-danger` alone computes rgb(255,107,107), but
   * `text-foreground text-danger` computes rgb(243,245,248) in EITHER order.
   *
   * Every error message in the app rendered near-white instead of red, and no
   * test saw it because the class string contained "text-danger" and looked
   * right. So this asserts the emitted set has exactly ONE colour in it —
   * which a className-contains check cannot do.
   */
  it("emits exactly one colour class, so a variant colour cannot be shadowed", () => {
    render(
      <Text variant="danger" className="text-sm">
        error
      </Text>,
    );

    expect(colorClassesOn(screen.getByText("error"))).toEqual(["text-danger"]);
  });

  it("keeps non-colour className additions", () => {
    render(
      <Text variant="danger" className="text-sm">
        error
      </Text>,
    );
    expect(screen.getByText("error")).toHaveClass("text-sm");
  });

  it("renders as the requested element", () => {
    render(<Text as="h2">heading</Text>);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
