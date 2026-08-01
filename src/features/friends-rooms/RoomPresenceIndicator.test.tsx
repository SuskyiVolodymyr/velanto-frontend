import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomPresenceIndicator } from "./RoomPresenceIndicator";
import type { MyRoomSummary } from "./room-types";
import type { User } from "@/src/shared/types/user";

const push = vi.fn();
let pathname = "/";
let rooms: MyRoomSummary[] = [];
let currentUser: User | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock("./friends-rooms-presence-context", () => ({
  useFriendsRoomsPresence: () => ({ rooms, refresh: vi.fn() }),
}));

function summary(overrides: Partial<MyRoomSummary> = {}): MyRoomSummary {
  return {
    id: "room-1",
    packTitle: "Best Movies",
    status: "lobby",
    players: [
      { userId: "u1", username: "Alice", avatarKey: null },
      { userId: "u2", username: "Bob", avatarKey: null },
    ],
    ...overrides,
  };
}

function asUser(id: string): User {
  return {
    id,
    email: null,
    username: id,
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = "/";
  rooms = [];
  currentUser = asUser("u1");
});

describe("RoomPresenceIndicator", () => {
  it("renders a button with player avatars for an active room", () => {
    rooms = [summary()];
    render(<RoomPresenceIndicator />);

    expect(
      screen.getByRole("button", { name: "Return to Best Movies" }),
    ).toBeInTheDocument();
    // Avatars fall back to the initial when there's no image.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  // Capacity is not on MyRoomSummary (a Guess-who room seats up to 8, Voting
  // up to 12) — the chip no longer assumes a fixed 4-seat room, so it renders
  // no empty-seat placeholders at all, just the real member count.
  it("shows no empty-seat placeholders and just the member count", () => {
    rooms = [summary()]; // 2 players
    const { container } = render(<RoomPresenceIndicator />);

    expect(
      container.querySelectorAll('[class*="border-dashed"]'),
    ).toHaveLength(0);
    expect(screen.getByText("2 in room")).toBeInTheDocument();
  });

  // A 6-player room would have gone NEGATIVE under the old
  // `MAX_PLAYERS - room.players.length` math (4 - 6 = -2); this pins that a
  // roster bigger than the old fixed cap renders cleanly with no stray
  // overflow chip and no crash.
  it("does not render empty-seat placeholders for a room bigger than the old fixed cap", () => {
    rooms = [
      summary({
        players: [
          { userId: "u1", username: "Alice", avatarKey: null },
          { userId: "u2", username: "Bob", avatarKey: null },
          { userId: "u3", username: "Carol", avatarKey: null },
          { userId: "u4", username: "Dave", avatarKey: null },
          { userId: "u5", username: "Eve", avatarKey: null },
          { userId: "u6", username: "Frank", avatarKey: null },
        ],
      }),
    ];
    render(<RoomPresenceIndicator />);

    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    expect(screen.getByText("6 in room")).toBeInTheDocument();
  });

  it("navigates to the room on click", async () => {
    const user = userEvent.setup();
    rooms = [summary()];
    render(<RoomPresenceIndicator />);

    await user.click(
      screen.getByRole("button", { name: "Return to Best Movies" }),
    );
    expect(push).toHaveBeenCalledWith("/rooms/room-1");
  });

  it("renders nothing when there are no active rooms", () => {
    rooms = [];
    const { container } = render(<RoomPresenceIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when signed out", () => {
    currentUser = null;
    rooms = [summary()];
    const { container } = render(<RoomPresenceIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides the entry for the room you're currently viewing", () => {
    pathname = "/rooms/room-1";
    rooms = [
      summary({ id: "room-1" }),
      summary({ id: "room-2", packTitle: "Top Songs" }),
    ];
    render(<RoomPresenceIndicator />);

    // The room you're on is suppressed; the other still shows.
    expect(
      screen.queryByRole("button", { name: "Return to Best Movies" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return to Top Songs" }),
    ).toBeInTheDocument();
  });
});
