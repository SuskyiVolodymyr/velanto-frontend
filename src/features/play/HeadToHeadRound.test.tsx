import { describe, expect, it, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { HeadToHeadRound } from "./HeadToHeadRound";

afterEach(() => {
  vi.unstubAllEnvs();
});

const LEFT = { id: "i1", type: "text" as const, title: "Goku", value: "Goku" };
const RIGHT = {
  id: "i2",
  type: "text" as const,
  title: "Vegeta",
  value: "Vegeta",
};

const COVER_TONE = "#2b2a3a";

describe("HeadToHeadRound", () => {
  it("renders both items in full immediately, with no reveal control", () => {
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId={null}
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    expect(screen.getByText("Goku")).toBeInTheDocument();
    expect(screen.getByText("Vegeta")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show next/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onSelect with the left item's id when the left card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId={null}
        onSelect={onSelect}
        coverTone={COVER_TONE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Goku" }));

    expect(onSelect).toHaveBeenCalledWith("i1");
  });

  it("calls onSelect with the right item's id when the right card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId={null}
        onSelect={onSelect}
        coverTone={COVER_TONE}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Vegeta" }));

    expect(onSelect).toHaveBeenCalledWith("i2");
  });

  it("shows a real YouTube player for a youtube item and still calls onSelect via its own pick control", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const videoItem = {
      id: "v1",
      type: "youtube" as const,
      title: "Opening theme",
      value: "https://youtu.be/KsF_hdjWJjo",
    };
    render(
      <HeadToHeadRound
        left={videoItem}
        right={RIGHT}
        selectedId={null}
        onSelect={onSelect}
        coverTone={COVER_TONE}
      />,
    );

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Play video preview" }),
    );
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Pick Opening theme" }),
    );
    expect(onSelect).toHaveBeenCalledWith("v1");
  });

  it("renders an image item, resolved from its key, and calls onSelect via its pick control", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const imageItem = {
      id: "im1",
      type: "image" as const,
      title: "Poster",
      value: "media/item/poster.webp",
    };
    render(
      <HeadToHeadRound
        left={imageItem}
        right={RIGHT}
        selectedId={null}
        onSelect={onSelect}
        coverTone={COVER_TONE}
      />,
    );

    expect(screen.getByRole("img", { name: "Poster" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/poster.webp",
    );

    await user.click(screen.getByRole("button", { name: "Pick Poster" }));
    expect(onSelect).toHaveBeenCalledWith("im1");
  });

  it("marks only the selected contender as pressed", () => {
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId="i2"
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    // These are toggles now, not commit controls — the pressed state is the
    // only thing telling a screen-reader user which side they have chosen.
    expect(screen.getByRole("button", { name: "Pick Goku" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Pick Vegeta" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders exactly one literal VS badge", () => {
    // e2e/play.spec.ts does a strict-mode getByText("VS", { exact: true }) —
    // a second match anywhere on this screen (e.g. inside a card label) would
    // break that query.
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId={null}
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    expect(screen.getAllByText("VS", { exact: true })).toHaveLength(1);
  });

  it("washes the chosen contender's card in accent and leaves the other plain", () => {
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId="i1"
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    const [selectedCard, unselectedCard] =
      screen.getAllByTestId("h2h-contender");
    expect(selectedCard.className).toContain("border-acc/50");
    expect(selectedCard.className).toContain("bg-acc/[0.08]");
    expect(unselectedCard.className).toContain("border-border");
    expect(unselectedCard.className).not.toContain("bg-acc/[0.08]");
  });

  it("sizes each contender's media to 16:9 rather than a fixed pixel height", () => {
    // Regression guard. `cn()` is a plain join, not tailwind-merge, so an
    // `h-[230px] w-full` passed down here landed *alongside* YouTubeCard's own
    // `aspect-video` — and an explicit width+height beats `aspect-ratio`, so the
    // embedded player was letterboxed into a 2.58:1 box instead of 16:9.
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    render(
      <HeadToHeadRound
        left={{
          id: "v1",
          type: "youtube" as const,
          title: "Opening theme",
          value: "https://youtu.be/KsF_hdjWJjo",
        }}
        right={{
          id: "im1",
          type: "image" as const,
          title: "Poster",
          value: "media/item/poster.webp",
        }}
        selectedId={null}
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    for (const testId of ["youtube-card", "image-card"]) {
      const media = screen.getByTestId(testId);
      expect(media.className).toContain("aspect-video");
      expect(media.className).not.toMatch(/\bh-\[/);
    }
  });

  it("selects the contender when anywhere on its card body is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId={null}
        onSelect={onSelect}
        coverTone={COVER_TONE}
      />,
    );

    await user.click(screen.getAllByTestId("h2h-contender")[0]);

    expect(onSelect).toHaveBeenCalledWith("i1");
  });

  it("does not select when the media area itself is engaged", async () => {
    // The card body being clickable must not extend to the player: engaging a
    // video has to start it, not pick the contender out from under the viewer.
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <HeadToHeadRound
        left={{
          id: "v1",
          type: "youtube" as const,
          title: "Opening theme",
          value: "https://youtu.be/KsF_hdjWJjo",
        }}
        right={RIGHT}
        selectedId={null}
        onSelect={onSelect}
        coverTone={COVER_TONE}
      />,
    );

    await user.click(screen.getByTestId("youtube-card"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("labels every contender's pick control 'Pick this one' while the round is untouched", () => {
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId={null}
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    expect(screen.getAllByText("Pick this one")).toHaveLength(2);
    expect(screen.queryByText("Your pick")).not.toBeInTheDocument();
  });

  it("switches only the chosen contender's pick control to 'Your pick'", () => {
    render(
      <HeadToHeadRound
        left={LEFT}
        right={RIGHT}
        selectedId="i1"
        onSelect={vi.fn()}
        coverTone={COVER_TONE}
      />,
    );

    expect(screen.getByText("Your pick")).toBeInTheDocument();
    expect(screen.getAllByText("Pick this one")).toHaveLength(1);
  });
});
