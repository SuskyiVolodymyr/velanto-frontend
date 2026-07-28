import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultAgainPanel } from "./ResultAgainPanel";
import { writeLastPlayId } from "@/src/shared/lib/last-play-storage";

beforeEach(() => {
  sessionStorage.clear();
});

describe("ResultAgainPanel", () => {
  it("renders the share-card title, note, and a Back to pack link", () => {
    render(
      <ResultAgainPanel
        packId="pack-1"
        status="approved"
        picks={null}
        shared={false}
      />,
    );

    expect(screen.getByText("Share your run")).toBeInTheDocument();
    expect(
      screen.getByText(/link to this exact run/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to pack" }),
    ).toHaveAttribute("href", "/packs/pack-1");
  });

  it("links the play-again CTA at the pack's play route", () => {
    render(
      <ResultAgainPanel
        packId="pack-1"
        status="approved"
        picks={null}
        shared={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Play it again" }),
    ).toHaveAttribute("href", "/packs/pack-1/play");
  });

  it("switches to shared-appropriate wording when shared", () => {
    render(
      <ResultAgainPanel
        packId="pack-1"
        status="approved"
        picks={null}
        shared
      />,
    );

    expect(screen.getByText("Share this run")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Give it a go" }),
    ).toHaveAttribute("href", "/packs/pack-1/play");
    expect(screen.queryByText("Play it again")).toBeNull();
  });

  it("shows the Copy share link button for an approved, non-shared result", () => {
    render(
      <ResultAgainPanel
        packId="pack-1"
        status="approved"
        picks={null}
        shared={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Copy share link" }),
    ).toBeInTheDocument();
  });

  it("hides the Copy share link button for a non-approved pack", () => {
    render(
      <ResultAgainPanel
        packId="pack-1"
        status="pending"
        picks={null}
        shared={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Copy share link" }),
    ).not.toBeInTheDocument();
  });

  // No Share on a shared result: the picks on screen are someone else's, so
  // the only thing there is to share is the link the reader arrived on.
  it("hides the Copy share link button on a shared result", () => {
    render(
      <ResultAgainPanel
        packId="pack-1"
        status="approved"
        picks={null}
        shared
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Copy share link" }),
    ).not.toBeInTheDocument();
  });

  // The play id lands when the record request resolves, which can be AFTER
  // this card has mounted — resolving it when the popover opens (not at
  // mount) means a quick click still gets the short link.
  it("uses a play id that arrives after mount", async () => {
    const user = userEvent.setup();
    render(
      <ResultAgainPanel
        packId="p1"
        status="approved"
        picks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
        shared={false}
      />,
    );

    writeLastPlayId("p1", "play-9");
    await user.click(screen.getByRole("button", { name: "Copy share link" }));

    expect(screen.getByRole("textbox")).toHaveValue(
      "http://localhost:3000/packs/p1/result?play=play-9",
    );
  });

  it("falls back to the encoded picks while no play id is known", async () => {
    const user = userEvent.setup();
    render(
      <ResultAgainPanel
        packId="p2"
        status="approved"
        picks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
        shared={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy share link" }));

    expect((screen.getByRole("textbox") as HTMLInputElement).value).toContain(
      "?p=",
    );
  });
});
