import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { VersusRound } from "./VersusRound";

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

function youtubeItem(id: string, title: string, value: string) {
  return { id, type: "youtube" as const, title, value };
}

function imageItem(id: string, title: string, key: string) {
  return { id, type: "image" as const, title, value: key };
}

const PACK_COVER_TONE = "#2b2a3a";

const SIDE_A = {
  name: "Boys",
  items: [textItem("1", "Naruto"), textItem("2", "Sasuke")],
};
const SIDE_B = { name: "Girls", items: [textItem("3", "Sakura")] };

describe("VersusRound", () => {
  it("renders both sides with a VS divider", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.getByText("Boys")).toBeInTheDocument();
    expect(screen.getByText("Girls")).toBeInTheDocument();
    // Exactly one "VS" — the e2e suite's getByText query is strict-mode.
    expect(screen.getAllByText("VS", { exact: true })).toHaveLength(1);
    // All of a side's items render at once (no reveal gating).
    expect(screen.getByText("Naruto")).toBeInTheDocument();
    expect(screen.getByText("Sasuke")).toBeInTheDocument();
  });

  it("stacks the two sides in one column, VS between them — the mock has no side-by-side nxn layout", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const grid = screen.getByText("VS").parentElement;
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid?.className).not.toMatch(/grid-cols-\[1fr_auto_1fr\]/);
  });

  it("shows no A/B letter badge — the two sides are already disambiguated by name upstream", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.queryByText("A")).not.toBeInTheDocument();
    expect(screen.queryByText("B")).not.toBeInTheDocument();
  });

  it("reflects the selected side via aria-pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const boysButton = screen.getByRole("button", { name: "Pick Boys" });
    const girlsButton = screen.getByRole("button", { name: "Pick Girls" });
    expect(boysButton).toHaveAttribute("aria-pressed", "false");
    expect(girlsButton).toHaveAttribute("aria-pressed", "false");

    await user.click(boysButton);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("calls onSelect with the side INDEX when a side is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(onSelect).toHaveBeenCalledWith(0);
    await user.click(screen.getByRole("button", { name: "Pick Girls" }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("selects a side via the keyboard (Enter)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    screen.getByRole("button", { name: "Pick Girls" }).focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("distinguishes two same-named sides (single-pool) by index", async () => {
    // A single-pool round labels both sides generically; selection must still
    // resolve to the correct index even though the names collide.
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={{ name: "Side A", items: [textItem("1", "Naruto")] }}
        sideB={{ name: "Side B", items: [textItem("2", "Luffy")] }}
        selectedSide={0}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Side B" }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("shows a real YouTube player for a youtube-type item within a side", () => {
    const sideWithVideo = {
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toBeInTheDocument();
  });

  it("sizes a video item's media to 16:9 rather than a fixed pixel height", () => {
    // Regression guard, same trap as HeadToHeadRound: an h-[Npx] alongside
    // YouTubeCard's own aspect-video would beat aspect-ratio and letterbox it.
    const sideWithVideo = {
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const media = screen.getByTestId("youtube-card");
    expect(media.className).toContain("aspect-video");
    expect(media.className).not.toMatch(/\bh-\[/);
  });

  it("renders an image item within a side and still selects the side on click", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const sideWithImage = {
      name: "Boys",
      items: [imageItem("i1", "Naruto", "media/item/naruto.webp")],
    };
    render(
      <VersusRound
        sideA={sideWithImage}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.getByRole("img", { name: "Naruto" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/naruto.webp",
    );
    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(onSelect).toHaveBeenCalledWith(0);
    vi.unstubAllEnvs();
  });

  it("does not select the side when clicking the video's own play button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const sideWithVideo = {
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not select the side when activating the video's own play button via the keyboard", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const sideWithVideo = {
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    screen.getByRole("button", { name: "Play video preview" }).focus();
    await user.keyboard("{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects a side via the keyboard (Space)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    screen.getByRole("button", { name: "Pick Boys" }).focus();
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  // Deliberate deviation from the mock's literal `repeat(count, 1fr)`: the
  // mock's own demo never shows more than 2 items a side, but create-pack
  // allows up to 8. A fixed column count equal to the item count squeezes
  // every tile down to a sliver at 8 (PACK_CONTAINER's own width divided 8
  // ways falls under the auto-fit floor below) — auto-fit instead wraps onto
  // more rows, keeping tiles at a legible minimum width regardless of N.
  it("lays a side's items out in an auto-fit grid, not one column per item", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const naruto = screen.getByText("Naruto");
    const grid = naruto.closest('[style*="grid-template-columns"]');
    expect(grid).toHaveStyle({
      gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    });
  });

  it("forces a single column of items on mobile — auto-fit still allows 2-up under 720px, too cramped for a video", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const naruto = screen.getByText("Naruto");
    const grid = naruto.closest('[style*="grid-template-columns"]');
    expect(grid?.className).toContain("max-[720px]:!grid-cols-1");
  });

  it("shows a trailing check beside the label of the selected side only", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={0}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const boysButton = screen.getByRole("button", { name: "Pick Boys" });
    const girlsButton = screen.getByRole("button", { name: "Pick Girls" });
    expect(
      boysButton.querySelector('[aria-hidden="true"] svg'),
    ).toBeInTheDocument();
    expect(
      girlsButton.querySelector('[aria-hidden="true"] svg'),
    ).not.toBeInTheDocument();
  });

  it("has no separate footer 'Selected' row — the mock's only selected signal is the label check and the panel wash", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={0}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.queryByText("Selected")).not.toBeInTheDocument();
  });

  it("washes the selected side's panel in accent and leaves the other plain", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={0}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const boysButton = screen.getByRole("button", { name: "Pick Boys" });
    const girlsButton = screen.getByRole("button", { name: "Pick Girls" });
    expect(boysButton.className).toContain("border-acc/50");
    expect(boysButton.className).toContain("bg-acc/[0.08]");
    expect(girlsButton.className).toContain("border-border");
    expect(girlsButton.className).not.toContain("bg-acc/[0.08]");
  });
});
