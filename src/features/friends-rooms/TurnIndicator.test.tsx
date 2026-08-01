import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { TurnIndicator } from "./TurnIndicator";

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
    label: null,
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
    label: null,
  },
];

describe("TurnIndicator", () => {
  it("shows a distinct 'your turn' CTA state when the viewer holds the turn", () => {
    render(
      <TurnIndicator players={PLAYERS} turnUserId="u1" currentUserId="u1" />,
    );
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });

  it("shows 'waiting for Alice' when someone else holds the turn", () => {
    render(
      <TurnIndicator players={PLAYERS} turnUserId="u1" currentUserId="u2" />,
    );
    expect(screen.getByText(/waiting for alice/i)).toBeInTheDocument();
  });

  it("renders nothing (round over) when turnUserId is null", () => {
    const { container } = render(
      <TurnIndicator players={PLAYERS} turnUserId={null} currentUserId="u2" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
