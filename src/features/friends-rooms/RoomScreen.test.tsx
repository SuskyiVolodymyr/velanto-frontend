import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomScreen } from "./RoomScreen";
import type { FriendsRoom, RoomConnection } from "./use-friends-room";
import type { ClaimRejection, RoomPlayerState, RoomState } from "./room-types";
import type { Item } from "@/src/shared/types/pack";
import type { User } from "@/src/shared/types/user";

// The room hook and auth are the whole surface RoomScreen sits on; drive both
// from fixtures so each phase can be rendered in isolation.
const claim = vi.fn();
const ready = vi.fn();
const next = vi.fn();
const lock = vi.fn();
const leave = vi.fn();

let room: FriendsRoom;
let currentUser: User | null;

vi.mock("./use-friends-room", () => ({
  useFriendsRoom: () => room,
}));

vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

function textItem(id: string, title: string): Item {
  return { id, type: "text", title, value: "" };
}

function player(
  userId: string,
  username: string,
  overrides: Partial<RoomPlayerState> = {},
): RoomPlayerState {
  return {
    userId,
    username,
    avatarKey: null,
    seat: overrides.seat ?? 0,
    connected: overrides.connected ?? true,
    ready: overrides.ready ?? false,
    next: overrides.next ?? false,
    claimedItemId: overrides.claimedItemId ?? null,
  };
}

function baseState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    id: "room-1",
    code: "ABC123",
    packId: "pack-1",
    packTitle: "Best Movies",
    hostId: "host",
    status: "lobby",
    phase: "lobby",
    locked: false,
    maxPlayers: 4,
    totalRounds: 3,
    roundIndex: 0,
    players: [
      player("host", "Alice", { seat: 0 }),
      player("guest", "Bob", { seat: 1 }),
    ],
    round: null,
    results: [],
    ...overrides,
  };
}

function setRoom(
  state: RoomState | null,
  connection: RoomConnection = "open",
  lastRejection: ClaimRejection | null = null,
) {
  room = { state, connection, lastRejection, claim, ready, next, lock, leave };
}

function asUser(id: string): User {
  return {
    id,
    email: null,
    username: id === "host" ? "Alice" : "Bob",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = asUser("host");
  setRoom(baseState());
});

describe("RoomScreen — lobby", () => {
  it("renders every seat plus empty chairs up to capacity", () => {
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // 4 seats total, 2 filled ⇒ 2 empty chairs.
    expect(screen.getAllByText("Empty seat")).toHaveLength(2);
  });

  it("shows the host the copy and lock controls", () => {
    currentUser = asUser("host");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.getByRole("button", { name: "Copy code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lock room" }),
    ).toBeInTheDocument();
  });

  it("hides the copy and lock controls from a guest", () => {
    currentUser = asUser("guest");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.queryByRole("button", { name: "Copy code" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Lock room" }),
    ).not.toBeInTheDocument();
  });

  it("does not show the join code as plain text by default", () => {
    currentUser = asUser("host");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    // The code is masked until deliberately revealed.
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
  });

  it("reveals the code only after the host clicks Reveal", async () => {
    const user = userEvent.setup();
    currentUser = asUser("host");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("toggles ready for the viewer", async () => {
    const user = userEvent.setup();
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    await user.click(screen.getByRole("button", { name: "Ready up" }));
    expect(ready).toHaveBeenCalledTimes(1);
  });
});

describe("RoomScreen — round", () => {
  function roundState() {
    return baseState({
      status: "playing",
      phase: "round",
      round: {
        index: 0,
        items: [
          textItem("i1", "Apple"),
          textItem("i2", "Banana"),
          textItem("i3", "Cherry"),
        ],
        // Bob is sacrificing Banana.
        claims: { guest: "i2" },
        survivorItemId: null,
      },
    });
  }

  it("renders every item on the board", () => {
    setRoom(roundState());
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Cherry")).toBeInTheDocument();
  });

  it("claims a free item by its id when clicked", async () => {
    const user = userEvent.setup();
    setRoom(roundState());
    render(<RoomScreen roomId="room-1" />);

    await user.click(screen.getByRole("button", { name: "Sacrifice Apple" }));
    expect(claim).toHaveBeenCalledWith("i1");
  });

  it("does not make a taken item claimable", () => {
    setRoom(roundState());
    render(<RoomScreen roomId="room-1" />);

    // Banana is already claimed by Bob — not a claim button.
    expect(
      screen.queryByRole("button", { name: "Sacrifice Banana" }),
    ).not.toBeInTheDocument();
  });

  it("shows the claimant's avatar on a taken item", () => {
    setRoom(roundState());
    render(<RoomScreen roomId="room-1" />);

    // Bob's avatar (initial "B") rides the Banana card.
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
  });

  it("reports claim progress", () => {
    setRoom(roundState());
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("1 of 2 have chosen")).toBeInTheDocument();
  });

  // A disconnected player keeps their seat and the round waits for them — the
  // backend resolves only once every SEATED player has claimed, never skipping a
  // dropped one. So the denominator is total players, not just the connected
  // ones; counting connected would imply the round can resolve while a seat is
  // still empty, which it can't.
  it("counts every seated player, including a disconnected one, in the denominator", () => {
    setRoom(
      baseState({
        status: "playing",
        phase: "round",
        players: [
          player("host", "Alice", { seat: 0 }),
          player("guest", "Bob", { seat: 1 }),
          // Charlie dropped mid-round but still holds seat 2.
          player("carol", "Charlie", { seat: 2, connected: false }),
        ],
        round: {
          index: 0,
          items: [
            textItem("i1", "Apple"),
            textItem("i2", "Banana"),
            textItem("i3", "Cherry"),
            textItem("i4", "Date"),
          ],
          claims: { guest: "i2" },
          survivorItemId: null,
        },
      }),
    );
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("1 of 3 have chosen")).toBeInTheDocument();
    expect(screen.queryByText("1 of 2 have chosen")).not.toBeInTheDocument();
  });
});

describe("RoomScreen — between", () => {
  function betweenState() {
    return baseState({
      status: "playing",
      phase: "between",
      players: [
        player("host", "Alice", { seat: 0, claimedItemId: "i1", next: false }),
        player("guest", "Bob", { seat: 1, claimedItemId: "i2", next: true }),
      ],
      round: {
        index: 0,
        items: [
          textItem("i1", "Apple"),
          textItem("i2", "Banana"),
          textItem("i3", "Cherry"),
        ],
        claims: { host: "i1", guest: "i2" },
        // Cherry (i3) is unclaimed ⇒ survivor.
        survivorItemId: "i3",
      },
    });
  }

  it("shows the survivor prominently", () => {
    setRoom(betweenState());
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.getByText("This item survived the round."),
    ).toBeInTheDocument();
    // Cherry is the survivor; it appears in the survivor card and the board.
    expect(screen.getAllByText("Cherry").length).toBeGreaterThan(0);
  });

  it("labels eliminated items with who sacrificed them", () => {
    setRoom(betweenState());
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("Sacrificed by Alice")).toBeInTheDocument();
    expect(screen.getByText("Sacrificed by Bob")).toBeInTheDocument();
  });

  it("presses Next", async () => {
    const user = userEvent.setup();
    setRoom(betweenState());
    render(<RoomScreen roomId="room-1" />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("RoomScreen — results", () => {
  function finishedState() {
    return baseState({
      status: "finished",
      phase: "finished",
      totalRounds: 2,
      results: [
        {
          index: 0,
          items: [textItem("a1", "Apple"), textItem("a2", "Banana")],
          claims: { host: "a1" },
          survivorItemId: "a2",
        },
        {
          index: 1,
          items: [textItem("b1", "Cherry"), textItem("b2", "Date")],
          claims: { host: "b1" },
          survivorItemId: "b2",
        },
      ],
    });
  }

  it("renders one block per round with the right survivor", () => {
    setRoom(finishedState());
    render(<RoomScreen roomId="room-1" />);

    const round1 = screen.getByRole("region", { name: "Round 1" });
    const round2 = screen.getByRole("region", { name: "Round 2" });

    // Each round's survivor carries the "Survivor" label inside its own block.
    expect(within(round1).getByText("Banana")).toBeInTheDocument();
    expect(within(round1).getByText("Survivor")).toBeInTheDocument();
    expect(within(round2).getByText("Date")).toBeInTheDocument();
    expect(within(round2).getByText("Survivor")).toBeInTheDocument();
  });
});

describe("RoomScreen — connection", () => {
  it("shows an ended state when the socket is closed", () => {
    setRoom(null, "closed");
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("This room has ended")).toBeInTheDocument();
  });

  it("keeps the board and shows a reconnecting banner while connecting", () => {
    setRoom(baseState(), "connecting");
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
    // The lobby is still on screen underneath the banner.
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  // Teardown closes every socket the instant a game ends, which arrives as
  // connection "closed". The results must survive that — they render from the
  // final snapshot we already hold, not from a live socket. If the closed check
  // came first, the results would flash and be replaced by "this room ended".
  it("shows results for a finished game even after the socket closes", () => {
    setRoom(
      baseState({
        status: "finished",
        phase: "finished",
        totalRounds: 1,
        results: [
          {
            index: 0,
            items: [textItem("a1", "Apple"), textItem("a2", "Banana")],
            claims: { host: "a1" },
            survivorItemId: "a2",
          },
        ],
      }),
      "closed",
    );
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByRole("region", { name: "Round 1" })).toBeInTheDocument();
    expect(screen.queryByText("This room has ended")).not.toBeInTheDocument();
  });
});
