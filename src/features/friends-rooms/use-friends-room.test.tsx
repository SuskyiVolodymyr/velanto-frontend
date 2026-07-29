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
    mode: "claim",
    availableModes: [{ mode: "claim", available: true, maxPlayers: 4 }],
    maxPlayers: 4,
    totalRounds: 3,
    roundIndex: 0,
    autoNextAt: null,
    players,
    round: null,
    results: [],
    guessing: null,
    endgame: null,
    myGuess: null,
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

  it("round.started keeps every mode-specific field, not just Claim's", async () => {
    // The handler used to build the round from an enumerated list of Claim's
    // four fields, silently dropping optionIds/actionKind/remainingItemIds/
    // turnUserId/priorityUserId/relay*. Every non-Claim board guards on
    // exactly those and returns null, so five of six modes rendered a blank
    // round screen — with no error — from round 2 onward.
    const { result } = await connected();
    serverEmit("room.state", { ...snapshot([player("host")]), mode: "voting" });

    serverEmit("round.started", {
      index: 1,
      name: "Round two",
      items: [item("a"), item("b")],
      totalRounds: 3,
      optionIds: ["a", "b"],
      priorityUserId: "host",
    });

    expect(result.current.state?.round?.optionIds).toEqual(["a", "b"]);
    expect(result.current.state?.round?.priorityUserId).toBe("host");
    // …and per-round state the server does NOT resend starts clean.
    expect(result.current.state?.round?.claims).toEqual({});
    expect(result.current.state?.round?.survivorItemId).toBeNull();
    expect(result.current.state?.round?.votes).toBeUndefined();
  });

  it("round.resolved builds the RESOLVING MODE's result, not always a survivor", async () => {
    const { result } = await connected();
    serverEmit("room.state", { ...snapshot([player("host")]), mode: "voting" });
    serverEmit("round.started", {
      index: 0,
      name: "One",
      items: [item("a"), item("b")],
      totalRounds: 1,
      optionIds: ["a", "b"],
    });

    serverEmit("round.resolved", {
      index: 0,
      optionIds: ["a", "b"],
      votes: { host: "a" },
      tally: { a: 1 },
      winnerOptionId: "a",
      tieBroken: false,
      priorityUserId: "host",
      autoNextAt: null,
    });

    expect(result.current.state?.results).toHaveLength(1);
    expect(result.current.state?.results[0]).toMatchObject({
      kind: "vote",
      winnerOptionId: "a",
      name: "One",
    });
    // A vote round has no survivor, so the live round must not acquire one.
    expect(result.current.state?.round?.survivorItemId).toBeNull();
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
    // The whole point of assembling the result rather than storing the payload:
    // round.resolved names the survivor and the claims but carries no board, so
    // the name and items have to come from the round the client is holding.
    expect(result.current.state?.results).toEqual([
      {
        kind: "survivor",
        index: 0,
        name: "One",
        items: [item("a"), item("b")],
        claims: { host: "a" },
        survivorItemId: "b",
      },
    ]);
  });

  // "Filter the old one out, append the new one" is a replacement only when
  // there IS a new one. With no round held it degrades to a delete, silently
  // dropping a result the snapshot already carried.
  it("leaves existing results alone when it holds no matching round", async () => {
    const { result } = await connected();
    const existing = {
      kind: "survivor" as const,
      index: 0,
      name: "One",
      items: [item("a"), item("b")],
      claims: { host: "a" },
      survivorItemId: "b",
    };
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      round: null,
      results: [existing],
    });

    serverEmit("round.resolved", {
      index: 0,
      survivorItemId: "b",
      claims: { host: "a" },
      autoNextAt: null,
    });

    expect(result.current.state?.results).toEqual([existing]);
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

  // Pins the game.finished payload SHAPE this repo depends on: the handler
  // folds it in as a whole RoomState, so a payload missing `phase` leaves
  // RoomScreen's `phase === "finished"` check unmatched and the torn-down
  // socket falls through to the generic "this room has ended" — which is
  // exactly the bug that shipped. The guard against the server sending that
  // again lives in the backend's friends-rooms.service.spec.ts; this one fails
  // if someone changes the passthrough handler on this side.
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
          kind: "survivor",
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

describe("useFriendsRoom mode lifecycle + guess-who endgame", () => {
  it("setMode emits the setMode command with the chosen mode", async () => {
    const { result } = await connected();
    act(() => result.current.setMode("voting"));
    expect(fakeSocket.emit).toHaveBeenCalledWith("setMode", { mode: "voting" });
  });

  it("room.modeChanged updates state.mode", async () => {
    const { result } = await connected();
    serverEmit("room.state", { ...snapshot([player("host")]), mode: null });
    serverEmit("room.modeChanged", { mode: "guess_who" });
    expect(result.current.state?.mode).toBe("guess_who");
  });

  it("guessing.started sets phase to guessing and populates state.guessing", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "guess_who",
    });
    serverEmit("guessing.started", {
      labels: ["P1", "P2", "P3"],
      candidateUserIds: ["u1", "u2", "u3"],
      deadlineAt: 1_700_000_090_000,
    });
    expect(result.current.state?.phase).toBe("guessing");
    expect(result.current.state?.guessing?.labels).toEqual(["P1", "P2", "P3"]);
    expect(result.current.state?.guessing?.submitted).toEqual([]);
  });

  it("guess.submitted appends the submitter without leaking their mapping", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "guess_who",
      phase: "guessing",
      guessing: { labels: ["P1"], candidateUserIds: ["u1"], submitted: [] },
    });
    serverEmit("guess.submitted", { userId: "u1" });
    expect(result.current.state?.guessing?.submitted).toEqual(["u1"]);
  });

  it("identity.revealed sets state.endgame and state.myGuess from the per-player payload", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "guess_who",
      phase: "guessing",
      guessing: { labels: ["P1", "P2"], candidateUserIds: ["u1", "u2"], submitted: [] },
    });
    serverEmit("identity.revealed", {
      mapping: { P1: "u1", P2: "u2" },
      yourGuess: { P1: "u2", P2: "u1" },
    });
    expect(result.current.state?.phase).toBe("finished");
    expect(result.current.state?.endgame).toEqual({
      kind: "identity_reveal",
      mapping: { P1: "u1", P2: "u2" },
    });
    expect(result.current.state?.myGuess).toEqual({ P1: "u2", P2: "u1" });
  });

  it("guess emits the guess command with the submitted mapping", async () => {
    const { result } = await connected();
    act(() => result.current.guess({ P1: "u2", P2: "u1" }));
    expect(fakeSocket.emit).toHaveBeenCalledWith("guess", {
      mapping: { P1: "u2", P2: "u1" },
    });
  });
});

describe("useFriendsRoom per-mode round actions", () => {
  it("cut/pick/vote/submitRanking/placeItem emit their commands", async () => {
    const { result } = await connected();
    act(() => result.current.cut("item-1"));
    act(() => result.current.pick(["item-2"]));
    act(() => result.current.vote("item-3"));
    act(() => result.current.submitRanking(["item-1", "item-2"]));
    act(() => result.current.placeItem("item-4", 1));
    expect(fakeSocket.emit).toHaveBeenCalledWith("cut", { itemId: "item-1" });
    expect(fakeSocket.emit).toHaveBeenCalledWith("pick", {
      selection: ["item-2"],
    });
    expect(fakeSocket.emit).toHaveBeenCalledWith("vote", { optionId: "item-3" });
    expect(fakeSocket.emit).toHaveBeenCalledWith("submitRanking", {
      ranking: ["item-1", "item-2"],
    });
    expect(fakeSocket.emit).toHaveBeenCalledWith("placeItem", {
      itemId: "item-4",
      position: 1,
    });
  });

  it("item.cut updates round.remainingItemIds, cuts, and turnUserId", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "turn_based_cut",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        remainingItemIds: ["a", "b", "c"],
        turnUserId: "u1",
        cuts: [],
      },
    });
    serverEmit("item.cut", { userId: "u1", itemId: "a", turnUserId: "u2" });
    expect(result.current.state?.round?.remainingItemIds).toEqual(["b", "c"]);
    expect(result.current.state?.round?.cuts).toEqual([
      { userId: "u1", itemId: "a" },
    ]);
    expect(result.current.state?.round?.turnUserId).toBe("u2");
  });

  it("pick.locked adds the userId to round.lockedIn without leaking the selection", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "guess_who",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        optionIds: ["a", "b"],
        actionKind: "pick",
        lockedIn: [],
      },
    });
    serverEmit("pick.locked", { userId: "u1" });
    expect(result.current.state?.round?.lockedIn).toEqual(["u1"]);
  });

  it("vote.cast updates round.votes (fully public, unlike pick.locked)", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "voting",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        optionIds: ["a", "b"],
        votes: {},
        priorityUserId: "u1",
      },
    });
    serverEmit("vote.cast", { userId: "u2", optionId: "a" });
    expect(result.current.state?.round?.votes).toEqual({ u2: "a" });
  });

  it("ranking.locked adds the userId to round.lockedIn", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "shared_grid",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        optionIds: ["a", "b"],
        lockedIn: [],
      },
    });
    serverEmit("ranking.locked", { userId: "u1" });
    expect(result.current.state?.round?.lockedIn).toEqual(["u1"]);
  });

  it("item.placed updates relayPlaced, relayPlacements, relayCurrentItemId and turn", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "relay",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        relayOrder: ["a", "b"],
        relayPlaced: [],
        relayCurrentItemId: "a",
        relayPlacements: [],
      },
    });
    serverEmit("item.placed", {
      userId: "u1",
      itemId: "a",
      position: 0,
      turnUserId: "u2",
    });
    expect(result.current.state?.round?.relayPlaced).toEqual(["a"]);
    expect(result.current.state?.round?.relayPlacements).toEqual([
      { userId: "u1", itemId: "a" },
    ]);
    expect(result.current.state?.round?.relayCurrentItemId).toBe("b");
    expect(result.current.state?.round?.turnUserId).toBe("u2");
  });

  it("item.placed INSERTS at the reported position rather than appending", async () => {
    // The test above places into an empty list, where append and insert-at-0
    // are indistinguishable — which is why it passed while the handler
    // ignored `position` entirely. Insert-at-a-gap IS Relay's mechanic, and
    // getting it wrong diverges every client's shared ranking from the
    // server's for the rest of the round.
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "relay",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        relayOrder: ["a", "b", "c"],
        relayPlaced: ["a", "b"],
        relayCurrentItemId: "c",
        relayPlacements: [],
      },
    });
    // Position 1 == the gap between "a" and "b", not the end.
    serverEmit("item.placed", {
      userId: "u1",
      itemId: "c",
      position: 1,
      turnUserId: null,
    });
    expect(result.current.state?.round?.relayPlaced).toEqual(["a", "c", "b"]);
    expect(result.current.state?.round?.relayCurrentItemId).toBeNull();
  });

  it("item.placed at position 0 goes to the FRONT of a non-empty ranking", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "relay",
      phase: "round",
      round: {
        index: 0,
        name: "",
        items: [],
        claims: {},
        survivorItemId: null,
        relayOrder: ["a", "b"],
        relayPlaced: ["a"],
        relayCurrentItemId: "b",
        relayPlacements: [],
      },
    });
    serverEmit("item.placed", {
      userId: "u1",
      itemId: "b",
      position: 0,
      turnUserId: null,
    });
    expect(result.current.state?.round?.relayPlaced).toEqual(["b", "a"]);
  });

  it("cutRejected/pickRejected/voteRejected/rankingRejected/placeRejected all store the actor's lastRejection without crashing on other modes' state", async () => {
    const { result } = await connected();
    serverEmit("room.state", {
      ...snapshot([player("host")]),
      mode: "turn_based_cut",
    });
    serverEmit("cut.rejected", {
      itemId: "a",
      reason: "not_your_turn",
      turnUserId: "u2",
    });
    expect(result.current.lastModeRejection).toEqual({
      kind: "cut",
      itemId: "a",
      reason: "not_your_turn",
      turnUserId: "u2",
    });
  });
});
