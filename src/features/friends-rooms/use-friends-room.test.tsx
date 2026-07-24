import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFriendsRoom } from "./use-friends-room";
import type { RoomPlayerState, RoomState } from "./room-types";

// A fake socket that records its handlers so the test can drive server events.
const handlers = new Map<string, (payload?: unknown) => void>();
const ioHandlers = new Map<string, (payload?: unknown) => void>();
const fakeSocket = {
  on: (event: string, cb: (payload?: unknown) => void) => {
    handlers.set(event, cb);
    return fakeSocket;
  },
  io: {
    on: (event: string, cb: (payload?: unknown) => void) => {
      ioHandlers.set(event, cb);
    },
  },
  emit: vi.fn(),
  disconnect: vi.fn(),
};

function serverEmit(event: string, payload?: unknown) {
  act(() => handlers.get(event)?.(payload));
}

vi.mock("socket.io-client", () => ({ io: () => fakeSocket }));
vi.mock("@/src/shared/lib/api-client", () => ({
  ensureFreshAccessToken: () => Promise.resolve("token"),
  getAccessToken: () => "token",
}));

beforeEach(() => {
  handlers.clear();
  ioHandlers.clear();
  vi.clearAllMocks();
});

// The socket is created inside a `.then()` on ensureFreshAccessToken, so its
// handlers aren't registered synchronously — wait for the connect handler.
async function connected() {
  const hook = renderHook(() => useFriendsRoom("room-1"));
  await waitFor(() => expect(handlers.has("connect")).toBe(true));
  return hook;
}

describe("useFriendsRoom connection", () => {
  it("starts connecting and opens on connect", async () => {
    const { result } = await connected();
    expect(result.current.connection).toBe("connecting");
    serverEmit("connect");
    expect(result.current.connection).toBe("open");
  });

  // The reported bug: returning to a room that no longer exists. The gateway
  // kicks the handshake, which arrives as reason "io server disconnect", and
  // socket.io does not auto-reconnect that — so the screen must go to "closed",
  // not sit in "connecting" (which renders "loading room" forever).
  it("closes — not reconnects — when the server drops the handshake", async () => {
    const { result } = await connected();
    serverEmit("disconnect", "io server disconnect");
    expect(result.current.connection).toBe("closed");
  });

  it("stays connecting on a transient transport drop", async () => {
    const { result } = await connected();
    serverEmit("connect");
    serverEmit("disconnect", "transport close");
    expect(result.current.connection).toBe("connecting");
  });
});

function player(
  userId: string,
  overrides: Partial<RoomPlayerState> = {},
): RoomPlayerState {
  return {
    userId,
    username: userId,
    avatarKey: null,
    seat: overrides.seat ?? 0,
    connected: overrides.connected ?? true,
    ready: overrides.ready ?? false,
    next: overrides.next ?? false,
    claimedItemId: overrides.claimedItemId ?? null,
  };
}

function snapshot(players: RoomPlayerState[], hostId = "host"): RoomState {
  return {
    id: "room-1",
    code: "ABC123",
    packId: "pack-1",
    packTitle: "Best Movies",
    hostId,
    status: "lobby",
    phase: "lobby",
    locked: false,
    maxPlayers: 4,
    totalRounds: 3,
    roundIndex: 0,
    autoNextAt: null,
    players,
    round: null,
    results: [],
  };
}

function item(id: string) {
  return { id, type: "text" as const, title: id, value: id };
}

describe("useFriendsRoom roster events", () => {
  it("host.changed rotates the host id", async () => {
    const { result } = await connected();
    serverEmit(
      "room.state",
      snapshot([player("host", { seat: 0 }), player("guest", { seat: 1 })]),
    );
    expect(result.current.state?.hostId).toBe("host");

    serverEmit("host.changed", { hostId: "guest" });
    expect(result.current.state?.hostId).toBe("guest");
  });

  it("player.left with seatKept:true keeps the seat and marks it offline", async () => {
    const { result } = await connected();
    serverEmit(
      "room.state",
      snapshot([player("host", { seat: 0 }), player("guest", { seat: 1 })]),
    );

    serverEmit("player.left", { userId: "guest", seatKept: true });

    const guest = result.current.state?.players.find(
      (p) => p.userId === "guest",
    );
    expect(guest).toBeDefined();
    expect(guest?.connected).toBe(false);
  });

  it("player.left with seatKept:false removes the player from the roster", async () => {
    const { result } = await connected();
    serverEmit(
      "room.state",
      snapshot([player("host", { seat: 0 }), player("guest", { seat: 1 })]),
    );

    serverEmit("player.left", { userId: "guest", seatKept: false });

    expect(
      result.current.state?.players.some((p) => p.userId === "guest"),
    ).toBe(false);
    expect(result.current.state?.players).toHaveLength(1);
  });

  it("player.kicked flags the viewer as removed by the host", async () => {
    const { result } = await connected();
    serverEmit("room.state", snapshot([player("host", { seat: 0 })]));
    expect(result.current.kicked).toBe(false);

    serverEmit("player.kicked");
    expect(result.current.kicked).toBe(true);
  });
});

describe("useFriendsRoom round events", () => {
  // The room's only full snapshot arrives while it is still a LOBBY, where the
  // server hasn't drawn the plan yet and reports totalRounds: 0. Folding the
  // real total in from round.started is the only thing that stops the header
  // reading "Round N of 0" for the whole game.
  it("takes the round name and the game length from round.started", async () => {
    const { result } = await connected();
    serverEmit("room.state", { ...snapshot([player("host")]), totalRounds: 0 });

    serverEmit("round.started", {
      index: 0,
      name: "Semifinals",
      items: [item("a"), item("b"), item("c")],
      totalRounds: 16,
    });

    expect(result.current.state?.totalRounds).toBe(16);
    expect(result.current.state?.round?.name).toBe("Semifinals");
    expect(result.current.state?.phase).toBe("round");
  });

  it("carries the auto-advance deadline from round.resolved", async () => {
    const { result } = await connected();
    serverEmit("room.state", snapshot([player("host")]));
    serverEmit("round.started", {
      index: 0,
      name: "One",
      items: [item("a"), item("b")],
      totalRounds: 2,
    });

    serverEmit("round.resolved", {
      index: 0,
      survivorItemId: "b",
      claims: { host: "a" },
      autoNextAt: 1_700_000_005_000,
    });

    expect(result.current.state?.phase).toBe("between");
    expect(result.current.state?.autoNextAt).toBe(1_700_000_005_000);
  });

  it("clears the deadline when the next round starts", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      autoNextAt: 1_700_000_005_000,
    });

    serverEmit("round.started", {
      index: 1,
      name: "Two",
      items: [item("c"), item("d")],
      totalRounds: 2,
    });

    expect(result.current.state?.autoNextAt).toBeNull();
  });

  // game.finished used to ship a bare `{ results }`, which this handler folded
  // in as a whole RoomState — leaving state with no `phase`, so RoomScreen's
  // `phase === "finished"` check missed and the torn-down socket fell through
  // to the generic "this room has ended". The results were never rendered.
  it("keeps a usable state when the game finishes", async () => {
    const { result } = await connected();
    serverEmit("room.state", snapshot([player("host"), player("guest")]));

    serverEmit("game.finished", {
      ...snapshot([player("host"), player("guest")]),
      code: null,
      status: "finished",
      phase: "finished",
      results: [
        {
          index: 0,
          name: "One",
          items: [item("a"), item("b")],
          claims: { host: "a" },
          survivorItemId: "b",
        },
      ],
    });

    expect(result.current.state?.phase).toBe("finished");
    expect(result.current.state?.results).toHaveLength(1);
    // The screen renders the roster and pack title alongside the rounds, so a
    // payload that dropped them would blank the results it was meant to show.
    expect(result.current.state?.players).toHaveLength(2);
    expect(result.current.state?.packTitle).toBe("Best Movies");
  });
});
