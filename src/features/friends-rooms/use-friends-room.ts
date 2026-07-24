"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  ensureFreshAccessToken,
  getAccessToken,
} from "@/src/shared/lib/api-client";
import {
  ROOM_COMMANDS,
  ROOM_EVENTS,
  type ClaimRejection,
  type ResolvedRoundState,
  type RoomPlayerState,
  type RoomState,
  type RoundState,
} from "./room-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Connection lifecycle, kept separate from game state so the UI can show
 *  "reconnecting…" without losing the last snapshot it had. */
export type RoomConnection = "connecting" | "open" | "closed";

export interface FriendsRoom {
  /** The last snapshot the server sent; null until the first `room.state`. */
  state: RoomState | null;
  connection: RoomConnection;
  /** The most recent rejected claim (e.g. an item taken first), for a nudge. */
  lastRejection: ClaimRejection | null;
  /** True once the host has kicked us — the server drops the socket right after,
   *  so this lets the UI show a "removed by the host" state distinct from the
   *  generic "room ended" that a plain closed socket falls to. */
  kicked: boolean;
  claim: (itemId: string) => void;
  ready: () => void;
  next: () => void;
  lock: (locked: boolean) => void;
  leave: () => void;
  /** Host-only: remove another player by id. The server drops their socket and
   *  broadcasts `player.left { seatKept: false }` to everyone else. */
  kick: (userId: string) => void;
}

/**
 * One live room over one socket. The server is the single source of truth: this
 * holds the last `room.state` snapshot and folds every subsequent event into it,
 * so the reducer here mirrors — but never re-derives — the engine's decisions.
 * A player-scoped patch (a claim, a ready) updates just that player; a
 * round-scoped one (a resolve) replaces the round. We never invent state the
 * server didn't send: a claim is optimistic only insofar as the server echoes
 * `claim.updated` right back.
 *
 * The socket authenticates its handshake with the in-memory access token, and
 * re-reads a fresh one on every reconnect (`auth` is a function), so a token
 * that expired while the tab slept is renewed on the next connect rather than
 * wedging the socket. The seat belongs to the userId, so a reconnect lands back
 * in the same chair and the server replays `room.state`.
 */
export function useFriendsRoom(roomId: string | null): FriendsRoom {
  const [state, setState] = useState<RoomState | null>(null);
  const [connection, setConnection] = useState<RoomConnection>("connecting");
  const [lastRejection, setLastRejection] = useState<ClaimRejection | null>(
    null,
  );
  const [kicked, setKicked] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    let socket: Socket | null = null;

    // Prime a fresh token before the first connect, then let socket.io's `auth`
    // callback re-read the current one on every reconnect attempt.
    void ensureFreshAccessToken().then(() => {
      if (cancelled) return;
      socket = io(`${API_BASE_URL}/friends-rooms`, {
        transports: ["websocket"],
        auth: (cb) => cb({ token: getAccessToken(), roomId }),
        query: { roomId },
      });
      socketRef.current = socket;

      socket.on("connect", () => setConnection("open"));
      socket.io.on("reconnect_attempt", () => setConnection("connecting"));
      socket.on("disconnect", (reason: string) => {
        // "io server disconnect" is the server deliberately dropping us — the
        // gateway kicks a handshake for a room that doesn't exist or one we
        // hold no seat in, and it also closes every socket when a room is torn
        // down. socket.io does NOT auto-reconnect a server-initiated close, so
        // treating it as transient left the screen stuck on "loading" forever
        // when you returned to a room that had been swept or never existed.
        // Any other reason (transport close, ping timeout) is a network blip
        // socket.io will retry — stay "connecting" and keep the last board up.
        setConnection(
          reason === "io server disconnect" ? "closed" : "connecting",
        );
      });
      socket.on("connect_error", () => setConnection("connecting"));

      // The full snapshot: on join and on every reconnect. Wholesale replace.
      // A fresh snapshot means we're actively seated in a room again, so clear
      // any stale `kicked` flag (this hook instance can be reused across a
      // roomId change without remounting).
      socket.on(ROOM_EVENTS.state, (next: RoomState) => {
        setState(next);
        setLastRejection(null);
        setKicked(false);
      });

      socket.on(
        ROOM_EVENTS.playerJoined,
        ({ player }: { player: RoomPlayerState }) =>
          patchPlayers(setState, (players) => upsertPlayer(players, player)),
      );
      socket.on(
        ROOM_EVENTS.playerLeft,
        ({ userId, seatKept }: { userId: string; seatKept: boolean }) =>
          // A disconnect (seatKept) keeps the seat and just marks it offline —
          // the round still waits on that player. An explicit leave (!seatKept)
          // removes the seat entirely, so they vanish from everyone's roster.
          seatKept
            ? patchPlayer(setState, userId, { connected: false })
            : patchPlayers(setState, (players) =>
                players.filter((p) => p.userId !== userId),
              ),
      );
      socket.on(ROOM_EVENTS.hostChanged, ({ hostId }: { hostId: string }) =>
        setState((s) => (s ? { ...s, hostId } : s)),
      );
      // Sent to the kicked player's own socket, just before the server drops it.
      // Flag it so the screen shows a "removed by the host" state rather than the
      // generic "room ended" the ensuing socket close would otherwise land on.
      socket.on(ROOM_EVENTS.playerKicked, () => setKicked(true));
      socket.on(
        ROOM_EVENTS.playerReady,
        ({ userId, ready }: { userId: string; ready: boolean }) =>
          patchPlayer(setState, userId, { ready }),
      );
      socket.on(ROOM_EVENTS.roomLocked, ({ locked }: { locked: boolean }) =>
        setState((s) => (s ? { ...s, locked } : s)),
      );

      // `totalRounds` rides this event because the room's only full snapshot
      // arrives when the socket connects — in the LOBBY, before the server has
      // drawn the plan, where it is 0. Without folding it in here the round
      // header counts up against nothing ("Round 16 of 0") for the whole game.
      socket.on(
        ROOM_EVENTS.roundStarted,
        ({
          index,
          name,
          items,
          totalRounds,
        }: Pick<RoundState, "index" | "name" | "items"> & {
          totalRounds: number;
        }) =>
          setState((s) =>
            s
              ? {
                  ...s,
                  phase: "round",
                  roundIndex: index,
                  totalRounds,
                  // The previous round's deadline is spent the moment this one
                  // starts; leaving it set would keep a countdown on screen.
                  autoNextAt: null,
                  round: {
                    index,
                    name,
                    items,
                    claims: {},
                    survivorItemId: null,
                  },
                  players: s.players.map((p) => ({
                    ...p,
                    claimedItemId: null,
                    next: false,
                  })),
                }
              : s,
          ),
      );

      socket.on(
        ROOM_EVENTS.claimUpdated,
        ({ userId, itemId }: { userId: string; itemId: string | null }) =>
          setState((s) => {
            if (!s || !s.round) return s;
            const claims = { ...s.round.claims };
            // Release-and-take is atomic on the server; drop this player's old
            // item from the map before setting the new one so a moved claim
            // doesn't leave a phantom hold behind.
            for (const [uid, iid] of Object.entries(claims)) {
              if (uid === userId || iid === itemId) delete claims[uid];
            }
            if (itemId) claims[userId] = itemId;
            return {
              ...s,
              round: { ...s.round, claims },
              players: s.players.map((p) =>
                p.userId === userId ? { ...p, claimedItemId: itemId } : p,
              ),
            };
          }),
      );

      // Sent to the claimant only: the item was taken first (or too fast). Keep
      // the last one so the board can flash the contested item.
      socket.on(ROOM_EVENTS.claimRejected, (rejection: ClaimRejection) => {
        setLastRejection(rejection);
        setState((s) =>
          s && s.round
            ? { ...s, round: { ...s.round, claims: rejection.claims } }
            : s,
        );
      });

      // The event names the survivor and the claims but not the board — the
      // client already has that in `round`. So the result is assembled from
      // both rather than storing the payload as-is, which would leave every
      // entry in `results` without its items or its name.
      socket.on(
        ROOM_EVENTS.roundResolved,
        (resolved: {
          index: number;
          survivorItemId: string;
          claims: Record<string, string>;
          autoNextAt: number | null;
        }) =>
          setState((s) => {
            if (!s) return s;
            const round = s.round;
            const finished: ResolvedRoundState[] = round
              ? [
                  {
                    index: resolved.index,
                    name: round.name,
                    items: round.items,
                    claims: resolved.claims,
                    survivorItemId: resolved.survivorItemId,
                  },
                ]
              : [];
            return {
              ...s,
              phase: "between",
              autoNextAt: resolved.autoNextAt ?? null,
              round: round
                ? { ...round, survivorItemId: resolved.survivorItemId }
                : round,
              results: [
                ...s.results.filter((r) => r.index !== resolved.index),
                ...finished,
              ].sort((a, b) => a.index - b.index),
            };
          }),
      );

      socket.on(ROOM_EVENTS.playerNext, ({ userId }: { userId: string }) =>
        patchPlayer(setState, userId, { next: true }),
      );

      socket.on(ROOM_EVENTS.gameFinished, (final: RoomState) =>
        setState(final),
      );
      socket.on(ROOM_EVENTS.roomClosed, () => setConnection("closed"));
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((command: string, payload?: unknown) => {
    socketRef.current?.emit(command, payload);
  }, []);

  return {
    state,
    connection,
    lastRejection,
    kicked,
    claim: useCallback(
      (itemId) => send(ROOM_COMMANDS.claim, { itemId }),
      [send],
    ),
    ready: useCallback(() => send(ROOM_COMMANDS.ready), [send]),
    next: useCallback(() => send(ROOM_COMMANDS.next), [send]),
    lock: useCallback((locked) => send(ROOM_COMMANDS.lock, { locked }), [send]),
    leave: useCallback(() => send(ROOM_COMMANDS.leave), [send]),
    kick: useCallback((userId) => send(ROOM_COMMANDS.kick, { userId }), [send]),
  };
}

type SetState = React.Dispatch<React.SetStateAction<RoomState | null>>;

function patchPlayers(
  setState: SetState,
  update: (players: RoomPlayerState[]) => RoomPlayerState[],
) {
  setState((s) => (s ? { ...s, players: update(s.players) } : s));
}

function patchPlayer(
  setState: SetState,
  userId: string,
  patch: Partial<RoomPlayerState>,
) {
  patchPlayers(setState, (players) =>
    players.map((p) => (p.userId === userId ? { ...p, ...patch } : p)),
  );
}

function upsertPlayer(
  players: RoomPlayerState[],
  player: RoomPlayerState,
): RoomPlayerState[] {
  const known = players.some((p) => p.userId === player.userId);
  const next = known
    ? players.map((p) => (p.userId === player.userId ? player : p))
    : [...players, player];
  return next.sort((a, b) => a.seat - b.seat);
}
