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

const SIDE_A = {
  id: "ca",
  name: "Boys",
  items: [textItem("1", "Naruto"), textItem("2", "Sasuke")],
};
const SIDE_B = { id: "cb", name: "Girls", items: [textItem("3", "Sakura")] };

describe("VersusRound", () => {
  it("renders both sides with a VS divider", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Boys")).toBeInTheDocument();
    expect(screen.getByText("Girls")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    // All of a side's items render at once (no reveal gating).
    expect(screen.getByText("Naruto")).toBeInTheDocument();
    expect(screen.getByText("Sasuke")).toBeInTheDocument();
  });

  it("calls onSelect with the side id when a side is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(onSelect).toHaveBeenCalledWith("ca");
  });

  it("selects a side via the keyboard (Enter)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    screen.getByRole("button", { name: "Pick Girls" }).focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("cb");
  });

  it("shows a real YouTube player for a youtube-type item within a side", () => {
    const sideWithVideo = {
      id: "ca",
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={vi.fn()}
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
      id: "ca",
      name: "Boys",
      items: [imageItem("i1", "Naruto", "media/item/naruto.webp")],
    };
    render(
      <VersusRound
        sideA={sideWithImage}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("img", { name: "Naruto" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/naruto.webp",
    );
    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(onSelect).toHaveBeenCalledWith("ca");
    vi.unstubAllEnvs();
  });

  it("does not select the side when clicking the video's own play button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const sideWithVideo = {
      id: "ca",
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={onSelect}
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
      id: "ca",
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        selectedId={null}
        onSelect={onSelect}
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
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    screen.getByRole("button", { name: "Pick Boys" }).focus();
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledWith("ca");
  });
});
