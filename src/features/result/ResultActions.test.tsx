import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultActions } from "./ResultActions";
import { writeLastPlayId } from "@/src/shared/lib/last-play-storage";

beforeEach(() => {
  sessionStorage.clear();
});

describe("ResultActions", () => {
  // The play id lands when the record request resolves, which can be AFTER
  // this row has mounted — rank_blind offers its result link immediately
  // rather than waiting for the record, so a quick click used to arrive here
  // first and fall back to the long `?p=` payload for good. Resolving the id
  // when the popover opens closes that: by then the request has long settled.
  it("uses a play id that arrives after mount", async () => {
    const user = userEvent.setup();
    render(
      <ResultActions
        packId="p1"
        status="approved"
        picks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
      />,
    );

    writeLastPlayId("p1", "play-9");
    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(screen.getByRole("textbox")).toHaveValue(
      "http://localhost:3000/packs/p1/result?play=play-9",
    );
  });

  // A pack of its own, not p1: writeLastPlayId also keeps an in-memory copy for
  // storage-blocked contexts, and that Map outlives sessionStorage.clear() —
  // reusing p1 here would read the id the test above wrote.
  it("falls back to the encoded picks while no play id is known", async () => {
    const user = userEvent.setup();
    render(
      <ResultActions
        packId="p2"
        status="approved"
        picks={[{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect((screen.getByRole("textbox") as HTMLInputElement).value).toContain(
      "?p=",
    );
  });

  it("shows Play again and a Share result button for an approved pack", () => {
    render(<ResultActions packId="p1" status="approved" picks={null} />);
    expect(screen.getByRole("link", { name: "Play again" })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
    expect(
      screen.getByRole("button", { name: "Share result" }),
    ).toBeInTheDocument();
  });

  it("invites a shared-result reader to try the pack rather than replay it", () => {
    // They are looking at someone else's run and have not played at all, so
    // "Play again" was telling them to repeat something they never did.
    render(<ResultActions packId="p1" status="approved" picks={null} shared />);
    expect(
      screen.getByRole("link", { name: "Try it yourself" }),
    ).toHaveAttribute("href", "/packs/p1/play");
    expect(screen.queryByRole("link", { name: "Play again" })).toBeNull();
    // Nothing here is theirs to share: the picks on screen belong to whoever
    // sent the link, so offering Share back invites passing off their run.
    expect(screen.queryByRole("button", { name: "Share result" })).toBeNull();
  });

  it("hides the Share result button for a non-approved pack", () => {
    render(<ResultActions packId="p1" status="pending" picks={null} />);
    expect(
      screen.queryByRole("button", { name: "Share result" }),
    ).not.toBeInTheDocument();
  });
});
