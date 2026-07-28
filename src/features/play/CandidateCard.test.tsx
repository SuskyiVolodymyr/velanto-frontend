import { describe, expect, it, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { CandidateCard } from "./CandidateCard";
import type { Item } from "@/src/shared/types/pack";

afterEach(() => {
  vi.unstubAllEnvs();
});

const PACK_COVER_TONE = "#2b2a3a";

function imageItem(id: string, title: string, key: string): Item {
  return { id, type: "image", title, value: key };
}

function textItem(id: string, title: string): Item {
  return { id, type: "text", title, value: title };
}

function youtubeItem(id: string, title: string, value: string): Item {
  return { id, type: "youtube", title, value };
}

describe("CandidateCard (image item)", () => {
  it("renders the image with the title as alt, resolved from the stored key", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    render(
      <CandidateCard
        item={imageItem("1", "Naruto", "media/item/naruto.webp")}
        index={0}
        selected={false}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const img = screen.getByRole("img", { name: "Naruto" });
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/naruto.webp",
    );
  });

  it("selects the item when the card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CandidateCard
        item={imageItem("1", "Naruto", "media/item/naruto.webp")}
        index={0}
        selected={false}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Naruto" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("CandidateCard (text item)", () => {
  it("renders a gradient media tile derived from the pack's cover tone", () => {
    render(
      <CandidateCard
        item={textItem("1", "Guren no Yumiya")}
        index={0}
        selected={false}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Pick Guren no Yumiya",
    });
    // The gradient tile is the first child of the card, using the pack's own
    // cover tone as the gradient's start colour.
    const tile = button.firstElementChild as HTMLElement;
    expect(tile.style.background).toContain(PACK_COVER_TONE);
    expect(tile.style.background).toContain("var(--background)");
  });

  it("shows the 2-digit candidate index on the tile and the select bar", () => {
    render(
      <CandidateCard
        item={textItem("1", "Redo")}
        index={4}
        selected={false}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    // Once on the gradient tile (top-2 start-2), once at the select bar's end.
    expect(screen.getAllByText("05")).toHaveLength(2);
  });

  it("gains an accessible Pick name for parity with the image/video branches", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CandidateCard
        item={textItem("2", "Redo")}
        index={1}
        selected={false}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    const button = screen.getByRole("button", { name: "Pick Redo" });
    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders the selected frame and select-bar tint when selected", () => {
    render(
      <CandidateCard
        item={textItem("1", "Redo")}
        index={0}
        selected
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.getByRole("button", { name: "Pick Redo" })).toHaveClass(
      "border-acc",
    );
  });
});

describe("CandidateCard (youtube item)", () => {
  it("shows a real player above a dedicated Pick control, not the video area", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CandidateCard
        item={youtubeItem("v1", "Guren no Yumiya", "https://youtu.be/KsF_hdjWJjo")}
        index={0}
        selected={false}
        onSelect={onSelect}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.getByTestId("youtube-card")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Pick Guren no Yumiya" }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("falls back to the gradient tile with a YouTube badge when the id can't be resolved", () => {
    render(
      <CandidateCard
        item={youtubeItem("v1", "Mystery clip", "not-a-youtube-url")}
        index={0}
        selected={false}
        onSelect={vi.fn()}
        packCoverTone={PACK_COVER_TONE}
      />,
    );

    expect(screen.queryByTestId("youtube-card")).not.toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pick Mystery clip" }),
    ).toBeInTheDocument();
  });
});
