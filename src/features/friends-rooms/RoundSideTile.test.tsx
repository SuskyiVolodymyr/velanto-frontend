import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoundSideTile } from "./RoundSideTile";
import type { Item } from "@/src/shared/types/pack";

const SIDE = { id: "ca", name: "Side A", itemIds: ["i1", "i2"] };
const ITEMS: Item[] = [
  { id: "i1", type: "text", title: "Radwimps", value: "Radwimps" },
  {
    id: "i2",
    type: "youtube",
    title: "Yorushika",
    value: "https://youtu.be/zVgKnfN9i34",
  },
];

describe("RoundSideTile", () => {
  // nxn is the one format whose choice is a POOL. The card has to name the
  // side AND show what was drawn for it, or a versus round is two unlabelled
  // boxes — which is what an unresolvable option id rendered as.
  it("names the side and shows every item drawn for it", () => {
    render(
      <RoundSideTile side={SIDE} items={ITEMS} actionLabel="Pick Side A" />,
    );

    const tile = screen.getByRole("group", { name: "Side A" });
    expect(within(tile).getByText("Side A")).toBeInTheDocument();
    // Each item's title sits with its OWN media, not all of them stacked
    // under the last video.
    for (const title of ["Radwimps", "Yorushika"]) {
      expect(within(tile).getByText(title)).toBeInTheDocument();
    }
    const yorushika = within(tile).getByText("Yorushika");
    expect(
      within(yorushika.parentElement!).getByRole("button", {
        name: /play video preview/i,
      }),
    ).toBeInTheDocument();
    // The media plays here too — a versus round of music videos is unplayable
    // as a list of names.
    expect(
      within(tile).getByRole("button", { name: /play video preview/i }),
    ).toBeInTheDocument();
  });

  // The whole card is the target — clicking anywhere on it picks the side.
  it("picks the side from anywhere on the card", async () => {
    const onPick = vi.fn();
    render(
      <RoundSideTile
        side={SIDE}
        items={ITEMS}
        actionLabel="Pick Side A"
        onPick={onPick}
      />,
    );

    const card = screen.getByRole("button", { name: "Pick Side A" });
    await userEvent.click(within(card).getByText("Side A"));
    expect(onPick).toHaveBeenCalledTimes(1);

    await userEvent.click(within(card).getByText("Radwimps"));
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  // ...except the video's own play button, which is inside the card. Previewing
  // a track must not also commit you to the side it belongs to.
  it("does not pick the side when the video's play button is pressed", async () => {
    const onPick = vi.fn();
    render(
      <RoundSideTile
        side={SIDE}
        items={ITEMS}
        actionLabel="Pick Side A"
        onPick={onPick}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /play video preview/i }),
    );
    expect(onPick).not.toHaveBeenCalled();
  });
});
