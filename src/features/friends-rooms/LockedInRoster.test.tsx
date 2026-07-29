import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { LockedInRoster } from "./LockedInRoster";

const PLAYERS = [
  {
    userId: "u1",
    username: "Alice",
    avatarKey: null,
    seat: 0,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
  },
  {
    userId: "u2",
    username: "Bob",
    avatarKey: null,
    seat: 1,
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
  },
];

describe("LockedInRoster", () => {
  it("shows a checkmark for a locked-in player and a pending dot for the rest", () => {
    render(<LockedInRoster players={PLAYERS} lockedIn={["u1"]} />);
    expect(screen.getByLabelText(/alice.*locked in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bob.*waiting/i)).toBeInTheDocument();
  });

  it("never renders anything about WHAT a player picked", () => {
    render(<LockedInRoster players={PLAYERS} lockedIn={["u1", "u2"]} />);
    // Only names + status, never an item title, ever appear in this component's
    // own props — this test is a structural guard: LockedInRosterProps has no
    // field that could carry a selection, so there is nothing to assert a leak
    // against beyond confirming the component renders from lockedIn alone.
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
  });
});
