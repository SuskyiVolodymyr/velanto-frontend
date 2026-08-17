"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerConnectionHandlers,
  registerRoomHandlers,
  registerRoundHandlers,
  registerModeHandlers,
} from "@/features/friends-rooms/hooks/room-socket-handlers";
import { io, type Socket } from "socket.io-client";
import { ensureFreshAccessToken, getAccessToken } from "@/api/api-client";
import { getGuestSession } from "../guest-session";
import {
  ROOM_COMMANDS,
  type ClaimRejection,
  type CutRejection,
  type GuessWhoRejection,
  type RelayRejection,
  type RoomMode,
  type RoomState,
  type SharedGridRejection,
  type SpyAccusationRejection,
  type SpyPickRejection,
  type VoteRejection,
} from "../room-types";

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
  /** Host-only: begin the game. A guest's call is refused server-side. */
  start: () => void;
  next: () => void;
  lock: (locked: boolean) => void;
  leave: () => void;
  /** Host-only: remove another player by id. The server drops their socket and
   *  broadcasts `player.left { seatKept: false }` to everyone else. */
  kick: (userId: string) => void;
  /** Host-only: choose (or change, in the lobby) the room's mode. */
  setMode: (mode: RoomMode) => void;
  /** Guess-who endgame: submit a label -> real-player mapping. */
  guess: (mapping: Record<string, string>) => void;
  cut: (itemId: string) => void;
  pick: (selection: string[]) => void;
  vote: (optionId: string) => void;
  submitRanking: (ranking: string[]) => void;
  placeItem: (itemId: string, position: number) => void;
  /** Spy: pick one option. For the SPY the id may be an opaque token. */
  spyPick: (optionId: string) => void;
  /** Spy endgame: name one player as the spy. Non-spies only. */
  accuse: (userId: string) => void;
  /** The most recent per-mode action rejection (cut/pick/vote/ranking/place),
   * kept distinct from `lastRejection` (Claim's own) so a mode never has to
   * guess which shape a shared field holds. */
  lastModeRejection:
    | (CutRejection & { kind: "cut" })
    | (GuessWhoRejection & { kind: "pick" })
    | (VoteRejection & { kind: "vote" })
    | (SharedGridRejection & { kind: "ranking" })
    | (RelayRejection & { kind: "place" })
    | (SpyPickRejection & { kind: "spyPick" })
    | (SpyAccusationRejection & { kind: "accusation" })
    | null;
  /** Increments on every mode rejection. Lets a board distinguish a REPEAT
   * rejection from the same one still being displayed — needed because the
   * reason alone is unchanged when you retry and are refused again. */
  modeRejectionSeq: number;
}

/**
 * Which credential this socket presents for `roomId`.
 *
 * A real session always wins: someone who guested into a room and later signed
 * in still has that guest entry in sessionStorage, and offering it would seat
 * them in the throwaway chair instead of their own. Read fresh on every
 * reconnect (socket.io calls `auth` again each attempt), so a session that
 * appears mid-game takes over from the next connect.
 */
function roomToken(roomId: string): string | null {
  return getAccessToken() ?? getGuestSession(roomId)?.token ?? null;
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
  const [lastModeRejection, setLastModeRejection] =
    useState<FriendsRoom["lastModeRejection"]>(null);
  // Bumped on every rejection so a board can tell "rejected again" from
  // "still showing the previous rejection" — Shared-grid uses it to remount
  // its auto-submitting rank board, which is otherwise frozen after a reject.
  const [modeRejectionSeq, setModeRejectionSeq] = useState(0);
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
        auth: (cb) => cb({ token: roomToken(roomId), roomId }),
        query: { roomId },
      });
      socketRef.current = socket;

      // Store a rejection AND bump its sequence, so a board can react to a
      // repeat of the same reason. Every mode's `*.rejected` goes through
      // here; a rejection that is never cleared would otherwise sit on
      // screen as a stale alert once one is actually rendered.
      const noteModeRejection = (
        rejection: FriendsRoom["lastModeRejection"],
      ) => {
        setLastModeRejection(rejection);
        setModeRejectionSeq((n) => n + 1);
      };

      const ctx = {
        setState,
        setConnection,
        setKicked,
        setLastRejection,
        setLastModeRejection,
        noteModeRejection,
      };
      registerConnectionHandlers(socket, ctx);
      registerRoomHandlers(socket, ctx);
      registerRoundHandlers(socket, ctx);
      registerModeHandlers(socket, ctx);
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
    start: useCallback(() => send(ROOM_COMMANDS.start), [send]),
    next: useCallback(() => send(ROOM_COMMANDS.next), [send]),
    lock: useCallback((locked) => send(ROOM_COMMANDS.lock, { locked }), [send]),
    leave: useCallback(() => send(ROOM_COMMANDS.leave), [send]),
    kick: useCallback((userId) => send(ROOM_COMMANDS.kick, { userId }), [send]),
    setMode: useCallback(
      (mode: RoomMode) => send(ROOM_COMMANDS.setMode, { mode }),
      [send],
    ),
    guess: useCallback(
      (mapping: Record<string, string>) =>
        send(ROOM_COMMANDS.guess, { mapping }),
      [send],
    ),
    cut: useCallback(
      (itemId: string) => send(ROOM_COMMANDS.cut, { itemId }),
      [send],
    ),
    pick: useCallback(
      (selection: string[]) => send(ROOM_COMMANDS.pick, { selection }),
      [send],
    ),
    vote: useCallback(
      (optionId: string) => send(ROOM_COMMANDS.vote, { optionId }),
      [send],
    ),
    spyPick: useCallback(
      // May be an opaque token rather than an item id — see ROOM_EVENTS.spyPicked.
      (optionId: string) => send(ROOM_COMMANDS.spyPick, { optionId }),
      [send],
    ),
    accuse: useCallback(
      (userId: string) => send(ROOM_COMMANDS.accuse, { userId }),
      [send],
    ),
    submitRanking: useCallback(
      (ranking: string[]) => send(ROOM_COMMANDS.submitRanking, { ranking }),
      [send],
    ),
    placeItem: useCallback(
      (itemId: string, position: number) =>
        send(ROOM_COMMANDS.placeItem, { itemId, position }),
      [send],
    ),
    lastModeRejection,
    modeRejectionSeq,
  };
}
