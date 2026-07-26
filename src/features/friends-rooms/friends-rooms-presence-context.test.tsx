import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  FriendsRoomsPresenceProvider,
  useFriendsRoomsPresence,
} from "./friends-rooms-presence-context";
import type { MyRoomSummary } from "./room-types";

const auth = vi.hoisted(() => ({
  current: { user: { id: "u1" } as { id: string } | null },
}));
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => auth.current,
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const { mine } = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock("./friends-rooms-client", () => ({
  friendsRoomsClient: { mine },
}));

// Toggle dormancy per test while preserving room-types' other exports.
const flag = vi.hoisted(() => ({ dormant: false }));
vi.mock("./room-types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./room-types")>();
  return {
    ...actual,
    get ROOMS_DORMANT() {
      return flag.dormant;
    },
  };
});

/** Surfaces the context's room count so tests can assert against the DOM. */
function Probe() {
  const { rooms } = useFriendsRoomsPresence();
  return <div data-testid="count">{rooms.length}</div>;
}

function renderProvider() {
  return render(
    <FriendsRoomsPresenceProvider>
      <Probe />
    </FriendsRoomsPresenceProvider>,
  );
}

function summary(id: string): MyRoomSummary {
  return {
    id,
    packTitle: "Best Movies",
    status: "lobby",
    players: [{ userId: "u1", username: "Alice", avatarKey: null }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = { user: { id: "u1" } };
  flag.dormant = false;
});

describe("FriendsRoomsPresenceProvider", () => {
  it("polls /mine and exposes the rooms when rooms are live", async () => {
    mine.mockResolvedValue([summary("r1")]);
    renderProvider();

    await waitFor(() => expect(mine).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("count")).toHaveTextContent("1"),
    );
  });

  it("does not poll /mine while rooms are dormant, and stays empty", async () => {
    flag.dormant = true;
    renderProvider();

    // Effects have flushed by the time render() returns; give a microtask for
    // safety, then assert no request went out and no rooms are exposed.
    await Promise.resolve();
    expect(mine).not.toHaveBeenCalled();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("does not poll /mine for a signed-out visitor", async () => {
    auth.current = { user: null };
    renderProvider();

    await Promise.resolve();
    expect(mine).not.toHaveBeenCalled();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
