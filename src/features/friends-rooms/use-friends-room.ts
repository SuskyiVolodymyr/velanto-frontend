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
  type CutRejection,
  type GuessWhoRejection,
  type RelayRejection,
  type RoomMode,
  type RoomPlayerState,
  type RoomState,
  type RoundResult,
  type RoundState,
  type SharedGridRejection,
  type VoteRejection,
} from "./room-types";
import {
  roundResultFromResolved,
  type RoundResolvedPayload,
} from "./round-resolved";

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
  /** Host-only: choose (or change, in the lobby) the room's mode. */
  setMode: (mode: RoomMode) => void;
  /** Guess-who endgame: submit a label -> real-player mapping. */
  guess: (mapping: Record<string, string>) => void;
  cut: (itemId: string) => void;
  pick: (selection: string[]) => void;
  vote: (optionId: string) => void;
  submitRanking: (ranking: string[]) => void;
  placeItem: (itemId: string, position: number) => void;
  /** The most recent per-mode action rejection (cut/pick/vote/ranking/place),
   * kept distinct from `lastRejection` (Claim's own) so a mode never has to
   * guess which shape a shared field holds. */
  lastModeRejection:
    | (CutRejection & { kind: "cut" })
    | (GuessWhoRejection & { kind: "pick" })
    | (VoteRejection & { kind: "vote" })
    | (SharedGridRejection & { kind: "ranking" })
    | (RelayRejection & { kind: "place" })
    | null;
  /** Increments on every mode rejection. Lets a board distinguish a REPEAT
   * rejection from the same one still being displayed — needed because the
   * reason alone is unchanged when you retry and are refused again. */
  modeRejectionSeq: number;
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
        auth: (cb) => cb({ token: getAccessToken(), roomId }),
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
        setLastModeRejection(null);
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

      socket.on(ROOM_EVENTS.modeChanged, ({ mode }: { mode: RoomMode }) =>
        setState((s) => (s ? { ...s, mode } : s)),
      );

      socket.on(
        ROOM_EVENTS.guessingStarted,
        ({
          labels,
          candidateUserIds,
          deadlineAt,
        }: {
          labels: string[];
          candidateUserIds: string[];
          deadlineAt: number;
        }) =>
          setState((s) =>
            s
              ? {
                  ...s,
                  phase: "guessing",
                  autoNextAt: deadlineAt,
                  guessing: { labels, candidateUserIds, submitted: [] },
                }
              : s,
          ),
      );

      socket.on(ROOM_EVENTS.guessSubmitted, ({ userId }: { userId: string }) =>
        setState((s) =>
          s && s.guessing
            ? {
                ...s,
                guessing: {
                  ...s.guessing,
                  submitted: s.guessing.submitted.includes(userId)
                    ? s.guessing.submitted
                    : [...s.guessing.submitted, userId],
                },
              }
            : s,
        ),
      );

      socket.on(
        ROOM_EVENTS.identityRevealed,
        ({
          mapping,
          yourGuess,
        }: {
          mapping: Record<string, string>;
          yourGuess: Record<string, string> | null;
        }) =>
          setState((s) =>
            s
              ? {
                  ...s,
                  phase: "finished",
                  autoNextAt: null,
                  endgame: { kind: "identity_reveal", mapping },
                  myGuess: yourGuess,
                }
              : s,
          ),
      );

      // `totalRounds` rides this event because the room's only full snapshot
      // arrives when the socket connects — in the LOBBY, before the server has
      // drawn the plan, where it is 0. Without folding it in here the round
      // header counts up against nothing ("Round 16 of 0") for the whole game.
      socket.on(
        ROOM_EVENTS.roundStarted,
        ({
          totalRounds,
          ...started
        }: Pick<RoundState, "index" | "name" | "items"> &
          Partial<RoundState> & {
            totalRounds: number;
          }) => {
          // Last round's rejection ("not your turn", "this round has ended")
          // is spent the moment a new round starts; leaving it set would
          // keep a stale alert on the new board.
          setLastModeRejection(null);
          setState((s) =>
            s
              ? {
                  ...s,
                  phase: "round",
                  roundIndex: started.index,
                  totalRounds,
                  // The previous round's deadline is spent the moment this one
                  // starts; leaving it set would keep a countdown on screen.
                  autoNextAt: null,
                  // Spread the payload rather than enumerating Claim's four
                  // fields. Every non-Claim board opens with a guard on a
                  // mode-specific field — optionIds (Voting, Shared-grid,
                  // Guess-who), remainingItemIds (Turn-based cut),
                  // relayPlaced (Relay) — and returns null when it is
                  // missing, so listing only Claim's fields here rendered a
                  // blank round screen with no error for five of six modes
                  // from round 2 onward (round 1 survived only on clients
                  // fresh enough to still be holding the connect snapshot).
                  // A fresh object each round, so per-round state that the
                  // server does NOT resend (lockedIn, votes, cuts) resets
                  // rather than carrying over.
                  round: {
                    ...started,
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
          );
        },
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
      socket.on(ROOM_EVENTS.roundResolved, (resolved: RoundResolvedPayload) =>
        setState((s) => {
          if (!s) return s;
          // Only the round we are actually holding can be assembled into a
          // result. Without the index check a mismatched pair would build a
          // result labelled with one round's index and another's items, and
          // stamp a foreign survivor onto the live round — which renders
          // every item as sacrificed. Without the null check the filter
          // below would DELETE a result the snapshot already carried, since
          // "filter then append nothing" is a removal, not a replacement.
          const round = s.round;
          const matches = Boolean(round && round.index === resolved.index);
          // One event name, five payload shapes, no `kind` on the wire —
          // so the room's own mode is what discriminates them. This used to
          // synthesize `kind: "survivor"` unconditionally, which left every
          // non-Claim between-board looking up its own kind, finding a
          // survivor, and rendering nothing.
          const replacement: RoundResult | null =
            round && matches
              ? roundResultFromResolved(s.mode, round, resolved)
              : null;
          return {
            ...s,
            phase: "between",
            autoNextAt: resolved.autoNextAt ?? null,
            round:
              round && matches && resolved.survivorItemId !== undefined
                ? { ...round, survivorItemId: resolved.survivorItemId }
                : round,
            results: replacement
              ? [
                  ...s.results.filter((r) => r.index !== replacement.index),
                  replacement,
                ].sort((a, b) => a.index - b.index)
              : s.results,
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

      socket.on(
        ROOM_EVENTS.itemCut,
        ({
          userId,
          itemId,
          turnUserId,
        }: {
          userId: string | null;
          itemId: string | null;
          turnUserId: string | null;
        }) => {
          // The turn just moved, so a "not your turn" rejection is spent.
          setLastModeRejection(null);
          setState((s) => {
            if (!s || !s.round) return s;
            const remainingItemIds = itemId
              ? (s.round.remainingItemIds ?? []).filter((id) => id !== itemId)
              : s.round.remainingItemIds;
            const cuts =
              userId && itemId
                ? [...(s.round.cuts ?? []), { userId, itemId }]
                : s.round.cuts;
            return {
              ...s,
              round: { ...s.round, remainingItemIds, cuts, turnUserId },
            };
          });
        },
      );
      socket.on(ROOM_EVENTS.cutRejected, (rejection: CutRejection) =>
        noteModeRejection({ ...rejection, kind: "cut" }),
      );

      socket.on(ROOM_EVENTS.pickLocked, ({ userId }: { userId: string }) =>
        setState((s) =>
          s && s.round
            ? {
                ...s,
                round: {
                  ...s.round,
                  lockedIn: s.round.lockedIn?.includes(userId)
                    ? s.round.lockedIn
                    : [...(s.round.lockedIn ?? []), userId],
                },
              }
            : s,
        ),
      );
      socket.on(ROOM_EVENTS.pickRejected, (rejection: GuessWhoRejection) =>
        noteModeRejection({ ...rejection, kind: "pick" }),
      );

      socket.on(
        ROOM_EVENTS.voteCast,
        ({ userId, optionId }: { userId: string; optionId: string }) =>
          setState((s) =>
            s && s.round
              ? {
                  ...s,
                  round: {
                    ...s.round,
                    votes: { ...s.round.votes, [userId]: optionId },
                  },
                }
              : s,
          ),
      );
      socket.on(ROOM_EVENTS.voteRejected, (rejection: VoteRejection) =>
        noteModeRejection({ ...rejection, kind: "vote" }),
      );

      socket.on(ROOM_EVENTS.rankingLocked, ({ userId }: { userId: string }) =>
        setState((s) =>
          s && s.round
            ? {
                ...s,
                round: {
                  ...s.round,
                  lockedIn: s.round.lockedIn?.includes(userId)
                    ? s.round.lockedIn
                    : [...(s.round.lockedIn ?? []), userId],
                },
              }
            : s,
        ),
      );
      socket.on(ROOM_EVENTS.rankingRejected, (rejection: SharedGridRejection) =>
        noteModeRejection({ ...rejection, kind: "ranking" }),
      );

      socket.on(
        ROOM_EVENTS.itemPlaced,
        ({
          userId,
          itemId,
          position,
          turnUserId,
        }: {
          userId: string | null;
          itemId: string | null;
          position?: number;
          turnUserId: string | null;
        }) => {
          // The turn just moved, so a "not your turn" rejection is spent.
          setLastModeRejection(null);
          setState((s) => {
            if (!s || !s.round) return s;
            // Insert AT `position`, don't append. Insert-at-a-gap is Relay's
            // entire mechanic — RelayInsertBoard calls
            // `onPlaceItem(itemId, i)` for gap `i`, the gateway validates
            // position 0 explicitly, and the engine echoes the accepted
            // position back on this event. Appending regardless meant any
            // placement other than at the very end left every client's
            // shared ranking permanently diverged from the server's, and
            // every later player then inserted against a board they were
            // seeing wrong. `position` is absent only on the roster-shrink
            // broadcast, which carries a null itemId and is skipped anyway.
            const placedBefore = s.round.relayPlaced;
            const relayPlaced =
              itemId && placedBefore
                ? [
                    ...placedBefore.slice(0, position ?? placedBefore.length),
                    itemId,
                    ...placedBefore.slice(position ?? placedBefore.length),
                  ]
                : placedBefore;
            const relayPlacements =
              userId && itemId
                ? [...(s.round.relayPlacements ?? []), { userId, itemId }]
                : s.round.relayPlacements;
            const remainingOrder = s.round.relayOrder?.filter(
              (id) => !(relayPlaced ?? []).includes(id),
            );
            return {
              ...s,
              round: {
                ...s.round,
                relayPlaced,
                relayPlacements,
                relayCurrentItemId: remainingOrder?.[0] ?? null,
                turnUserId,
              },
            };
          });
        },
      );
      socket.on(ROOM_EVENTS.placeRejected, (rejection: RelayRejection) =>
        noteModeRejection({ ...rejection, kind: "place" }),
      );
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
