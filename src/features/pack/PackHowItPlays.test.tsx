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

  // `t.raw` on a MISSING key returns next-intl's fallback STRING, not undefined,
  // so `steps.map(...)` threw. PackDetailScreen is a Server Component that
  // renders this unconditionally, so that threw the entire public pack page into
  // a 500 — for anyone, not just the author.
  //
  // UI-EXCLUDED:save_one_friends (velanto-frontend#368) is the format that makes
  // this reachable today (such a pack can arrive from the API), but the guard is
  // deliberately shape-based so a plain catalog typo is covered too.
  it("renders nothing instead of crashing when the format has no howItPlays entry", () => {
    expect(() =>
      render(<PackHowItPlays format={"save_one_friends" as PackFormat} />),
    ).not.toThrow();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("renders nothing instead of crashing for a format the catalog has never heard of", () => {
    expect(() =>
      render(<PackHowItPlays format={"telepathy" as PackFormat} />),
    ).not.toThrow();
  });
});
