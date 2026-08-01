import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoundItemTile } from "./RoundItemTile";
import type { Item } from "@/src/shared/types/pack";

const YOUTUBE: Item = {
  id: "y1",
  type: "youtube",
  title: "Silhouette",
  value: "https://youtu.be/zVgKnfN9i34?t=44",
};

describe("RoundItemTile", () => {
  // Tiles in a row stretch to the tallest, so a card with a short title — or
  // with no pick chips under it while its neighbours have some — grows past its
  // own content. The control has to grow with it, or the strip below the title
  // looks clickable and isn't. Asserted on classes: jsdom has no layout.
  it("grows its control to fill a stretched tile", () => {
    render(
      <RoundItemTile
        item={YOUTUBE}
        actionLabel="Pick Silhouette"
        onPick={vi.fn()}
      />,
    );

    const pick = screen.getByRole("button", { name: "Pick Silhouette" });
    expect(pick).toHaveClass("flex-1");
    expect(pick.parentElement).toHaveClass("flex", "flex-col");
  });

  it("lists the labels that picked it under the title", () => {
    render(
      <RoundItemTile
        item={YOUTUBE}
        actionLabel="Pick Silhouette"
        pickLabels={[
          { label: "P1", className: "" },
          { label: "P3", className: "" },
        ]}
      />,
    );

    const tile = screen.getByRole("group", { name: "Silhouette" });
    expect(within(tile).getByText("P1")).toBeInTheDocument();
    expect(within(tile).getByText("P3")).toBeInTheDocument();
  });
});
