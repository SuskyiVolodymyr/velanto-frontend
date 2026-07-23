import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackHowItPlays } from "./PackHowItPlays";
import type { PackFormat } from "@/src/shared/types/pack";

describe("PackHowItPlays", () => {
  it("renders the catalog's numbered steps for a format that has them", () => {
    const { container } = render(<PackHowItPlays format="save_one" />);
    // The catalog owns the wording; assert on the structure it produces.
    expect(container.querySelectorAll("div > span")).not.toHaveLength(0);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // save_one_friends is now a shipping, user-facing format, so it has its own
  // how-it-plays steps like every other. (It used to be the "no entry" fixture
  // here — that role moved to the unknown-format test below when the multiplayer
  // UI landed and the catalog gained this key.)
  it("renders the steps for save_one_friends", () => {
    render(<PackHowItPlays format={"save_one_friends" as PackFormat} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // The real guard: `t.raw` on a MISSING key returns next-intl's fallback STRING,
  // not undefined, so `steps.map(...)` would throw. PackDetailScreen is a Server
  // Component that renders this unconditionally, so that would take the entire
  // public pack page down with a 500 — for anyone, not just the author. The
  // guard is shape-based, so a plain catalog typo is covered too, not only a
  // format the UI has never heard of.
  it("renders nothing instead of crashing for a format with no howItPlays entry", () => {
    expect(() =>
      render(<PackHowItPlays format={"telepathy" as PackFormat} />),
    ).not.toThrow();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
