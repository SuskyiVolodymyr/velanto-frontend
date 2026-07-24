import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, screen, within } from "@testing-library/react";
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
const kick = vi.fn();
const push = vi.fn();

let room: FriendsRoom;
let currentUser: User | null;

vi.mock("./use-friends-room", () => ({
  useFriendsRoom: () => room,
}));

vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/rooms/room-1",
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
    autoNextAt: null,
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
  kicked = false,
) {
  room = {
    state,
    connection,
    lastRejection,
    kicked,
    claim,
    ready,
    next,
    lock,
    leave,
    kick,
  };
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
        name: "Round 1",
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
          name: "Round 1",
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

  // Without a name, every round rendered an identical header — no title, and a
  // counter that read "of 0" because totalRounds only ever arrived in the lobby
  // snapshot. Players read that as the same round being served again.
  it("titles the round by name and counts it against the game length", () => {
    setRoom(roundState());
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Round 1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 3")).toBeInTheDocument();
    // The instruction still shows — it steps down to a subheading, it isn't lost.
    expect(
      screen.getByText(
        "Claim one item to sacrifice. The item nobody claims survives.",
      ),
    ).toBeInTheDocument();
  });

  // A pack whose author named no rounds and whose pool name the server could
  // not resolve falls back to the instruction as the heading, as before.
  it("falls back to the instruction when the round has no name", () => {
    const state = roundState();
    setRoom({ ...state, round: { ...state.round!, name: "" } });
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Claim one item to sacrifice. The item nobody claims survives.",
      }),
    ).toBeInTheDocument();
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
        name: "Round 1",
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

  // The room advances itself if a player forgets to press Next. The countdown
  // is what stops that reading as the screen jumping on its own.
  it("counts down to the automatic advance", () => {
    vi.useFakeTimers();
    try {
      setRoom({ ...betweenState(), autoNextAt: Date.now() + 5_000 });
      render(<RoomScreen roomId="room-1" />);
      expect(screen.getByText("Next round in 5s")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(screen.getByText("Next round in 3s")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // Nothing pending — a room rebuilt from its rows, or one already advancing —
  // must not render a stuck "in 0s".
  it("shows no countdown when nothing is scheduled", () => {
    setRoom({ ...betweenState(), autoNextAt: null });
    render(<RoomScreen roomId="room-1" />);

    expect(screen.queryByText(/Next round in/)).not.toBeInTheDocument();
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

  // Bob has pressed Next, Alice hasn't ⇒ 1 of the 2 seated players are ready.
  // The gate waits for every seated player (advanceIfAllNext), so the
  // denominator is the full roster, matching the round's "chosen" counter.
  it("shows how many players have pressed Next", () => {
    setRoom(betweenState());
    render(<RoomScreen roomId="room-1" />);

    expect(screen.getByText("1 / 2 ready")).toBeInTheDocument();
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
          name: "Round 1",
          items: [textItem("a1", "Apple"), textItem("a2", "Banana")],
          claims: { host: "a1" },
          survivorItemId: "a2",
        },
        {
          index: 1,
          name: "Round 2",
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
            name: "Round 1",
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

describe("RoomScreen — leave", () => {
  it("leaves straight away from the lobby and navigates to the pack", async () => {
    const user = userEvent.setup();
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(leave).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/packs/pack-1");
  });

  it("confirms before leaving mid-game", async () => {
    const user = userEvent.setup();
    setRoom(
      baseState({
        status: "playing",
        phase: "round",
        round: {
          index: 0,
          name: "Round 1",
          items: [textItem("i1", "Apple"), textItem("i2", "Banana")],
          claims: {},
          survivorItemId: null,
        },
      }),
    );
    render(<RoomScreen roomId="room-1" />);

    // First click opens the confirm dialog — it must NOT leave yet.
    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(leave).not.toHaveBeenCalled();

    // Confirming in the dialog performs the leave.
    await user.click(screen.getByRole("button", { name: "Leave the game" }));
    expect(leave).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/packs/pack-1");
  });
});

describe("RoomScreen — kick", () => {
  it("shows the host a kick control beside a guest but not beside themselves", () => {
    currentUser = asUser("host");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    // Bob (guest) is kickable; Alice (host, self) is not.
    expect(
      screen.getByRole("button", { name: "Remove Bob from the room" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Alice from the room" }),
    ).not.toBeInTheDocument();
  });

  it("shows a guest no kick controls", () => {
    currentUser = asUser("guest");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.queryByRole("button", { name: /Remove .* from the room/ }),
    ).not.toBeInTheDocument();
  });

  it("kicks a player by id after confirming", async () => {
    const user = userEvent.setup();
    currentUser = asUser("host");
    setRoom(baseState());
    render(<RoomScreen roomId="room-1" />);

    await user.click(
      screen.getByRole("button", { name: "Remove Bob from the room" }),
    );
    // Not until the confirm dialog is accepted.
    expect(kick).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(kick).toHaveBeenCalledWith("guest");
  });

  it("shows a removed-by-host state when the viewer is kicked", () => {
    setRoom(baseState(), "open", null, true);
    render(<RoomScreen roomId="room-1" />);

    expect(
      screen.getByText("The host removed you from this room"),
    ).toBeInTheDocument();
    // Distinct from the neutral ended state.
    expect(screen.queryByText("This room has ended")).not.toBeInTheDocument();
  });
});
