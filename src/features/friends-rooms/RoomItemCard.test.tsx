import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomItemCard } from "./RoomItemCard";
import type { Item } from "@/src/shared/types/pack";
import type { RoomPlayerState } from "./room-types";

function youtubeItem(): Item {
  return {
    id: "yt1",
    type: "youtube",
    title: "Silhouette",
    value: "https://youtu.be/zVgKnfN9i34?t=44",
  };
}

function textItem(overrides: Partial<Item> = {}): Item {
  return { id: "t1", type: "text", title: "Apple", value: "", ...overrides };
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
        format="sacrifice_one"
        onClaim={() => {}}
      />,
    );

    const claim = screen.getByRole("button", { name: "Sacrifice Silhouette" });
    const play = screen.getByRole("button", { name: "Play video preview" });

    expect(claim).not.toContainElement(play);
    // The claim control is a leaf — it holds no nested interactive button.
    expect(within(claim).queryByRole("button")).toBeNull();
  });

  // Cards in a row stretch to the tallest one, so a card with a short title
  // grows past its own content. The claim control has to grow with it or the
  // empty strip under the title is dead space that looks clickable and isn't.
  // Asserted on the classes because jsdom has no layout to measure.
  it("grows the claim control to fill a stretched card", () => {
    render(
      <RoomItemCard
        item={youtubeItem()}
        index={0}
        status="free"
        format="save_one"
        onClaim={vi.fn()}
      />,
    );

    const claim = screen.getByRole("button", { name: /sacrifice silhouette/i });
    expect(claim).toHaveClass("flex-1");
    expect(claim.parentElement).toHaveClass("flex", "flex-col");
  });

  it("fires onClaim when a youtube card's claim control is clicked", async () => {
    const onClaim = vi.fn();
    const user = userEvent.setup();
    render(
      <RoomItemCard
        item={youtubeItem()}
        index={0}
        status="free"
        format="sacrifice_one"
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
        format="sacrifice_one"
        onClaim={onClaim}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sacrifice Apple" }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });
});

function claimant(username = "Fiona"): RoomPlayerState {
  return {
    userId: "u1",
    username,
    avatarKey: null,
    seat: 0,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: "t1",
    label: null,
  };
}

// The claimant used to be drawn TWICE on a text item: once in the body row
// (where the avatar replaces the item number) and once as the corner badge,
// which has no media to sit on and so landed on that same row. The corner badge
// exists to overlay media — it belongs only where there is media.
describe("RoomItemCard — claimant", () => {
  it("shows the claimant once on a text item", () => {
    render(
      <RoomItemCard
        item={textItem()}
        index={0}
        status="sacrificed"
        format="sacrifice_one"
        claimant={claimant()}
      />,
    );

    // UserAvatar with no avatarKey falls back to the initial.
    expect(screen.getAllByText("F")).toHaveLength(1);
    expect(screen.getByText("Sacrificed by Fiona")).toBeInTheDocument();
  });

  it("shows the claimant once on a media item", () => {
    render(
      <RoomItemCard
        item={youtubeItem()}
        index={0}
        status="sacrificed"
        format="sacrifice_one"
        claimant={claimant()}
      />,
    );

    expect(screen.getAllByText("F")).toHaveLength(1);
  });

  // Sharing a row with the title left the title a narrow column: a long name
  // broke one word per line while the claim label sat beside it in the space it
  // needed. The label gets its own line under the title.
  it("puts the claim label on its own line beneath the title", () => {
    render(
      <RoomItemCard
        item={textItem({
          title: "Spirited Away - Joe Hisaishi / One Summer's Day",
        })}
        index={0}
        status="sacrificed"
        format="save_one"
        claimant={claimant()}
      />,
    );

    const title = screen.getByText("Spirited Away - Joe Hisaishi / One Summer's Day");
    const label = screen.getByText("Sacrificed by Fiona");
    expect(title.parentElement).not.toContainElement(label);
  });

  it("still numbers an unclaimed item", () => {
    render(
      <RoomItemCard
        item={textItem()}
        index={2}
        status="free"
        format="sacrifice_one"
      />,
    );
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});

describe("RoomItemCard — a claim is a sacrifice in both formats", () => {
  // The engine has every player claim one item TO SACRIFICE, and the single
  // unclaimed item survive (claim.engine.ts) — that does not flip with the
  // pack's format. Labelling a save_one claim "Kept by <name>" described the
  // opposite game to the chrome directly above it, which asks the room to take
  // the one they want OUT. The pack's format still names the SURVIVOR (below).
  it.each(["save_one", "sacrifice_one"] as const)(
    "offers a %s room a sacrifice, not a save",
    (format) => {
      const item = { id: "i1", title: "Pizza", type: "text" as const, value: "Pizza" };
      render(
        <RoomItemCard
          item={item}
          index={0}
          status="free"
          format={format}
          onClaim={vi.fn()}
        />,
      );
      expect(
        screen.getByRole("button", { name: /sacrifice pizza/i }),
      ).toBeInTheDocument();
    },
  );

  it.each(["save_one", "sacrifice_one"] as const)(
    "names the claimant of a %s item the one who sacrificed it",
    (format) => {
      render(
        <RoomItemCard
          item={textItem()}
          index={0}
          status="sacrificed"
          format={format}
          claimant={claimant()}
        />,
      );
      expect(screen.getByText("Sacrificed by Fiona")).toBeInTheDocument();
    },
  );

  it("the survivor badge also flips: 'Saved' for save_one, 'Survivor' for sacrifice_one", () => {
    const item = { id: "i1", title: "Pizza", type: "text" as const, value: "Pizza" };
    render(
      <RoomItemCard item={item} index={0} status="survivor" format="save_one" />,
    );
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });
});
