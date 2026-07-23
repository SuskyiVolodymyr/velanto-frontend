import type { Item } from "@/src/shared/types/pack";

/**
 * The friends-room wire contract, hand-mirrored from velanto-backend
 * `src/modules/friends-rooms/types/room.ts`. Structural wire types, so — like
 * the play-results types and unlike the closed-set constants — they are not in
 * the cross-repo drift snapshot; keep them in step with the backend by hand.
 *
 * "Save One with Friends": 2-4 players share one pack in real time. Each round
 * shows `players + 1` items; every player claims one to sacrifice; claims are
 * mutually exclusive, so the single unclaimed item survives.
 */

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export type FriendsRoomStatus = "lobby" | "playing" | "finished" | "abandoned";

/** Which screen the client shows. `between` = a round resolved, waiting on Next. */
export type RoomPhase =
  "lobby" | "round" | "between" | "finished" | "abandoned";

export interface RoomPlayerState {
  userId: string;
  username: string;
  avatarKey: string | null;
  seat: number;
  connected: boolean;
  ready: boolean;
  /** Has pressed Next for the round that just resolved. */
  next: boolean;
  /** The item this player is sacrificing this round, or null. */
  claimedItemId: string | null;
}

export interface RoundState {
  index: number;
  items: Item[];
  /** { [userId]: itemId } as it stands right now. */
  claims: Record<string, string>;
  /** Null until the round resolves. */
  survivorItemId: string | null;
}

export interface ResolvedRoundState {
  index: number;
  items: Item[];
  claims: Record<string, string>;
  survivorItemId: string;
}

export interface RoomState {
  id: string;
  /** Null once released — a finished or abandoned room is unjoinable. */
  code: string | null;
  packId: string;
  packTitle: string;
  hostId: string;
  status: FriendsRoomStatus;
  phase: RoomPhase;
  /** Host-set stream-safety lock: true means the lobby is closed to new joins. */
  locked: boolean;
  maxPlayers: number;
  totalRounds: number;
  roundIndex: number;
  players: RoomPlayerState[];
  round: RoundState | null;
  results: ResolvedRoundState[];
}

/**
 * A room the signed-in user currently holds a seat in, as returned by
 * `GET /friends-rooms/mine`. Includes rooms you have navigated away from — you
 * remain a member until you explicitly Leave — so the persistent presence
 * indicator can offer a way back. A lighter projection of {@link RoomState}:
 * only what the indicator needs to show a chip and route back in.
 */
export interface MyRoomSummary {
  id: string;
  packTitle: string;
  status: "lobby" | "playing";
  players: {
    userId: string;
    username: string;
    avatarKey: string | null;
  }[];
}

export type ClaimRejectionReason =
  "taken" | "too_fast" | "not_in_round" | "round_not_active" | "not_a_player";

export interface ClaimRejection {
  itemId: string;
  reason: ClaimRejectionReason;
  claims: Record<string, string>;
}

/** Server → client event names — must match the backend's ROOM_EVENTS exactly. */
export const ROOM_EVENTS = {
  state: "room.state",
  playerJoined: "player.joined",
  playerLeft: "player.left",
  hostChanged: "host.changed",
  playerKicked: "player.kicked",
  playerReady: "player.ready",
  roomLocked: "room.locked",
  roundStarted: "round.started",
  claimUpdated: "claim.updated",
  claimRejected: "claim.rejected",
  roundResolved: "round.resolved",
  playerNext: "player.next",
  gameFinished: "game.finished",
  roomClosed: "room.closed",
} as const;

/** Client → server verbs. */
export const ROOM_COMMANDS = {
  claim: "claim",
  ready: "ready",
  next: "next",
  leave: "leave",
  lock: "lock",
  kick: "kick",
} as const;
