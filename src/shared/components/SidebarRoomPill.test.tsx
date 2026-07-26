import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { SidebarRoomPill } from "./SidebarRoomPill";
import type { MyRoomSummary } from "@/src/features/friends-rooms/room-types";

let rooms: MyRoomSummary[] = [];
let currentUser: { id: string } | null = { id: "u1" };

vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));
vi.mock(
  "@/src/features/friends-rooms/friends-rooms-presence-context",
  () => ({
    useFriendsRoomsPresence: () => ({ rooms, refresh: vi.fn() }),
  }),
);

function summary(): MyRoomSummary {
  return {
    id: "r1",
    packTitle: "Best Movies",
    status: "lobby",
    players: [{ userId: "u1", username: "Alice", avatarKey: null }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rooms = [];
  currentUser = { id: "u1" };
});

describe("SidebarRoomPill", () => {
  it("shows a rejoin pill for a room the user holds a seat in", () => {
    rooms = [summary()];
    render(<SidebarRoomPill />);

    expect(screen.getByText("Best Movies")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/rooms/r1");
  });

  // The dormancy path: the presence provider skips its poll while rooms are
  // dormant, so `rooms` is empty and the pill renders nothing at all.
  it("renders nothing when the presence provider reports no rooms", () => {
    rooms = [];
    const { container } = render(<SidebarRoomPill />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when signed out", () => {
    currentUser = null;
    rooms = [summary()];
    const { container } = render(<SidebarRoomPill />);

    expect(container).toBeEmptyDOMElement();
  });
});
