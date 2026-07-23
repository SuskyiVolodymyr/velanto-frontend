import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomItemCard } from "./RoomItemCard";
import type { Item } from "@/src/shared/types/pack";

function youtubeItem(): Item {
  return {
    id: "yt1",
    type: "youtube",
    title: "Silhouette",
    value: "https://youtu.be/zVgKnfN9i34?t=44",
  };
}

function textItem(): Item {
  return { id: "t1", type: "text", title: "Apple", value: "" };
}

describe("RoomItemCard — claimable", () => {
  // A resolvable youtube item renders YouTubeCard's own play button. Wrapping the
  // whole card in a claim <button> nests a button inside a button — invalid HTML
  // that breaks React hydration. The claim action must be its own control,
  // sibling to the player, not an ancestor of it.
  it("does not nest the video's play button inside the claim button", () => {
    render(
      <RoomItemCard
        item={youtubeItem()}
        index={0}
        status="free"
        onClaim={() => {}}
      />,
    );

    const claim = screen.getByRole("button", { name: "Sacrifice Silhouette" });
    const play = screen.getByRole("button", { name: "Play video preview" });

    expect(claim).not.toContainElement(play);
    // The claim control is a leaf — it holds no nested interactive button.
    expect(within(claim).queryByRole("button")).toBeNull();
  });

  it("fires onClaim when a youtube card's claim control is clicked", async () => {
    const onClaim = vi.fn();
    const user = userEvent.setup();
    render(
      <RoomItemCard
        item={youtubeItem()}
        index={0}
        status="free"
        onClaim={onClaim}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Sacrifice Silhouette" }),
    );
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it("keeps a text item as a single claim button", async () => {
    const onClaim = vi.fn();
    const user = userEvent.setup();
    render(
      <RoomItemCard
        item={textItem()}
        index={0}
        status="free"
        onClaim={onClaim}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sacrifice Apple" }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });
});
