import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomHeader } from "./RoomHeader";
import { baseRoomState } from "./test-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/** The decorative cover swatch — aria-hidden, so query it by its own marker. */
function swatch(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>("header > div > span");
  if (!el) throw new Error("cover swatch not found");
  return el;
}

describe("RoomHeader", () => {
  it("names the pack and its format", () => {
    render(<RoomHeader state={baseRoomState()} onLeave={vi.fn()} />);

    expect(screen.getByText("Test Pack")).toBeInTheDocument();
    expect(screen.getByText(/@packsmith/)).toBeInTheDocument();
  });

  // The header is the whole answer to "what are we playing?" for someone who
  // arrived from a shared link, so the swatch is the pack's, not a placeholder.
  it("paints the swatch with the pack's own tone", () => {
    const { container } = render(
      <RoomHeader
        state={baseRoomState({ packCoverTone: "#123456" })}
        onLeave={vi.fn()}
      />,
    );

    expect(swatch(container).style.background).toContain("rgb(18, 52, 86)");
  });

  it("renders an uploaded cover over the tone when the pack has one", () => {
    const { container } = render(
      <RoomHeader
        state={baseRoomState({ packCoverImageKey: "covers/abc.webp" })}
        onLeave={vi.fn()}
      />,
    );

    expect(swatch(container).querySelector("img")).not.toBeNull();
  });

  it("shows only the gradient when the pack has no uploaded cover", () => {
    const { container } = render(
      <RoomHeader
        state={baseRoomState({ packCoverImageKey: null })}
        onLeave={vi.fn()}
      />,
    );

    expect(swatch(container).querySelector("img")).toBeNull();
  });

  // During a deploy the frontend is live before every socket has reconnected to
  // the new gateway, so a snapshot can arrive without these fields. The header
  // must look the way it always did rather than emit an invalid gradient.
  it("falls back to the old tone for a snapshot with no cover fields", () => {
    const state = baseRoomState();
    delete (state as { packCoverTone?: string }).packCoverTone;

    const { container } = render(
      <RoomHeader state={state} onLeave={vi.fn()} />,
    );

    const background = swatch(container).style.background;
    expect(background).toContain("rgb(43, 42, 58)");
    expect(background).not.toContain("undefined");
  });
});
