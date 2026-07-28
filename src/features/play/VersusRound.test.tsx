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

  it("labels the side badges A / B by slot index, not by pool name", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={null}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    // The letter badges sit beside each side's name; both letters are on
    // screen exactly once each, independent of what the pools are named.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
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

  it("lays a side's items out in a grid sized to its item count", () => {
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
    expect(grid).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0,1fr))" });
  });

  it("shows a footer 'Selected' row under a side's items once picked", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={0}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("omits the footer row for the unselected side", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedSide={0}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    // Only sideA (index 0) is selected, so exactly one footer row renders.
    expect(screen.getAllByText("Selected")).toHaveLength(1);
  });
});
