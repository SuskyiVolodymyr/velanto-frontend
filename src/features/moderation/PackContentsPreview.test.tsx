import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackContentsPreview } from "./PackContentsPreview";
import type { Pack } from "@/src/shared/types/pack";

function pack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "p1",
    title: "Best Anime Openings",
    description: "…",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: ["Anime"],
    groups: [],
    rounds: [],
    authorId: "a1",
    createdAt: "2020-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "approved",
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    ...overrides,
  };
}

describe("PackContentsPreview", () => {
  describe("full-pack mode (no roundIndex)", () => {
    it("renders every pool with its items", () => {
      const p = pack({
        groups: [
          {
            id: "g1",
            name: "Openings",
            items: [
              { id: "i1", type: "text", title: "Guren no Yumiya", value: "Guren no Yumiya" },
            ],
          },
          {
            id: "g2",
            name: "Endings",
            items: [
              { id: "i2", type: "text", title: "Redo", value: "Redo" },
            ],
          },
        ],
      });

      render(<PackContentsPreview pack={p} />);

      expect(screen.getByRole("heading", { name: "Openings" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Endings" })).toBeInTheDocument();
      expect(screen.getByText("Guren no Yumiya")).toBeInTheDocument();
      expect(screen.getByText("Redo")).toBeInTheDocument();
    });

    it("shows a type visual for text, youtube, and image items", () => {
      const p = pack({
        groups: [
          {
            id: "g1",
            name: "Mixed pool",
            items: [
              { id: "i1", type: "text", title: "A text item", value: "A text item" },
              {
                id: "i2",
                type: "youtube",
                title: "A video item",
                value: "https://youtu.be/dQw4w9WgXcQ",
              },
              { id: "i3", type: "image", title: "An image item", value: "media/item/abc.webp" },
            ],
          },
        ],
      });

      render(<PackContentsPreview pack={p} />);

      expect(screen.getByRole("img", { name: "Text item" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "YouTube item" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Image item" })).toBeInTheDocument();
    });

    it("shows an empty state for a pool with no items", () => {
      const p = pack({
        groups: [{ id: "g1", name: "Empty pool", items: [] }],
      });

      render(<PackContentsPreview pack={p} />);

      expect(screen.getByRole("heading", { name: "Empty pool" })).toBeInTheDocument();
      expect(screen.getByText("This pool has no items yet.")).toBeInTheDocument();
    });

    it("shows an overall empty state when the pack has no pools", () => {
      const p = pack({ groups: [], rounds: [] });

      render(<PackContentsPreview pack={p} />);

      expect(screen.getByText("No pack contents to show.")).toBeInTheDocument();
    });
  });

  describe("round-scoped mode (roundIndex given)", () => {
    function roundScopedPack(): Pack {
      return pack({
        groups: [
          {
            id: "g1",
            name: "Round pool",
            items: [
              { id: "a", type: "text", title: "Item A", value: "Item A" },
              { id: "b", type: "text", title: "Item B", value: "Item B" },
              { id: "c", type: "text", title: "Item C", value: "Item C" },
            ],
          },
          {
            id: "g2",
            name: "Other pool",
            items: [{ id: "x", type: "text", title: "Item X", value: "Item X" }],
          },
        ],
        rounds: [
          {
            id: "r1",
            slots: [{ groupId: "g1", mode: "manual", itemIds: ["c", "a"] }],
          },
          {
            id: "r2",
            slots: [{ groupId: "g2", mode: "manual", itemIds: ["x"] }],
          },
        ],
      });
    }

    it("narrows rendering to just the given round's slots/pools", () => {
      const p = roundScopedPack();

      render(<PackContentsPreview pack={p} roundIndex={0} />);

      expect(screen.getByRole("heading", { name: "Round pool" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Other pool" })).not.toBeInTheDocument();
      expect(screen.queryByText("Item X")).not.toBeInTheDocument();
    });

    it("renders a manual slot's pinned itemIds, in order, not the whole pool", () => {
      const p = roundScopedPack();

      render(<PackContentsPreview pack={p} roundIndex={0} />);

      // Only the pinned items (c, a) appear — b was never pinned into this slot.
      expect(screen.getByText("Item C")).toBeInTheDocument();
      expect(screen.getByText("Item A")).toBeInTheDocument();
      expect(screen.queryByText("Item B")).not.toBeInTheDocument();

      const titles = screen.getAllByText(/^Item [A-Z]$/).map((el) => el.textContent);
      expect(titles).toEqual(["Item C", "Item A"]);
    });

    it("renders a random slot's full pool with a drawn-randomly note, not just the draw count", () => {
      const p = pack({
        groups: [
          {
            id: "g1",
            name: "Random pool",
            items: [
              { id: "a", type: "text", title: "Item A", value: "Item A" },
              { id: "b", type: "text", title: "Item B", value: "Item B" },
              { id: "c", type: "text", title: "Item C", value: "Item C" },
            ],
          },
        ],
        rounds: [
          {
            id: "r1",
            slots: [{ groupId: "g1", mode: "random", count: 1 }],
          },
        ],
      });

      render(<PackContentsPreview pack={p} roundIndex={0} />);

      // All 3 pool items render, even though the slot only draws 1 at play time.
      expect(screen.getByText("Item A")).toBeInTheDocument();
      expect(screen.getByText("Item B")).toBeInTheDocument();
      expect(screen.getByText("Item C")).toBeInTheDocument();
      expect(screen.getByText("Drawn randomly · 3 items in this pool")).toBeInTheDocument();
    });

    it("does not crash when a slot's groupId doesn't resolve to any pool", () => {
      const p = pack({
        groups: [{ id: "g1", name: "Real pool", items: [{ id: "a", type: "text", title: "Item A", value: "Item A" }] }],
        rounds: [
          {
            id: "r1",
            slots: [
              { groupId: "missing-group", mode: "manual", itemIds: ["a"] },
              { groupId: "g1", mode: "manual", itemIds: ["a"] },
            ],
          },
        ],
      });

      expect(() =>
        render(<PackContentsPreview pack={p} roundIndex={0} />),
      ).not.toThrow();
      // The resolvable slot still renders despite the sibling's dangling groupId.
      expect(screen.getByText("Item A")).toBeInTheDocument();
    });

    it("shows an empty state when roundIndex points past the end of rounds", () => {
      const p = roundScopedPack();

      render(<PackContentsPreview pack={p} roundIndex={5} />);

      expect(screen.getByText("No pack contents to show.")).toBeInTheDocument();
    });
  });

  describe("search and type filter", () => {
    function mixedPack(): Pack {
      return pack({
        groups: [
          {
            id: "g1",
            name: "Mixed pool",
            items: [
              { id: "i1", type: "text", title: "Alpha", value: "Alpha" },
              {
                id: "i2",
                type: "youtube",
                title: "Beta video",
                value: "https://youtu.be/dQw4w9WgXcQ",
              },
              { id: "i3", type: "image", title: "Gamma image", value: "media/item/abc.webp" },
            ],
          },
        ],
      });
    }

    it("filters items by search text", async () => {
      const user = userEvent.setup();
      render(<PackContentsPreview pack={mixedPack()} />);

      const search = screen.getByRole("searchbox", { name: "Search pack items" });
      await user.type(search, "beta");

      expect(screen.getByText("Beta video")).toBeInTheDocument();
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
      expect(screen.queryByText("Gamma image")).not.toBeInTheDocument();
    });

    it("filters items by type chip", async () => {
      const user = userEvent.setup();
      render(<PackContentsPreview pack={mixedPack()} />);

      await user.click(screen.getByRole("button", { name: "Image" }));

      expect(screen.getByText("Gamma image")).toBeInTheDocument();
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
      expect(screen.queryByText("Beta video")).not.toBeInTheDocument();
    });

    it("works in round-scoped mode too", async () => {
      const user = userEvent.setup();
      const p = pack({
        groups: [
          {
            id: "g1",
            name: "Round pool",
            items: [
              { id: "a", type: "text", title: "Alpha", value: "Alpha" },
              { id: "b", type: "text", title: "Beta", value: "Beta" },
            ],
          },
        ],
        rounds: [
          {
            id: "r1",
            slots: [{ groupId: "g1", mode: "manual", itemIds: ["a", "b"] }],
          },
        ],
      });

      render(<PackContentsPreview pack={p} roundIndex={0} />);
      const search = screen.getByRole("searchbox", { name: "Search pack items" });
      await user.type(search, "alpha");

      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    });

    it("shows a no-matches message when filters exclude every item in a non-empty pool", async () => {
      const user = userEvent.setup();
      render(<PackContentsPreview pack={mixedPack()} />);

      const search = screen.getByRole("searchbox", { name: "Search pack items" });
      await user.type(search, "nonexistent-title");

      expect(within(screen.getByRole("heading", { name: "Mixed pool" }).closest("section")!).getByText(
        "No items match your search.",
      )).toBeInTheDocument();
    });
  });
});
