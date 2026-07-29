import type { Item, PackFormat } from "@/src/shared/types/pack";

/**
 * The friends-room wire contract, hand-mirrored from velanto-backend
 * `src/modules/friends-rooms/types/room.ts` and `modes/mode.ts`. Structural
 * wire types, so — like play-results and unlike the closed-set constants —
 * most of this is NOT in the cross-repo drift snapshot; keep it in step with
 * the backend by hand. `ROOM_MODES` and `ROOM_MODE_BOUNDS` (closed sets) ARE
 * snapshotted (see cross-repo-drift.test.ts).
 *
 * A room now carries a MODE: the round mechanic + resolution rule + result
 * shape, chosen by the host in the lobby from `RoomState.availableModes`. See
 * docs/multiplayer-modes-redesign.md for the product brief this mirrors.
 */

/** The mode-agnostic fallback bounds (used only while `mode` is still null —
 * a freshly created room whose pack offers more than one mode). */
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export const ROOM_MODES = [
  "claim",
  "guess_who",
  "turn_based_cut",
  "voting",
  "shared_grid",
  "relay",
] as const;
export type RoomMode = (typeof ROOM_MODES)[number];

/**
 * Per-mode player bounds and eligible formats — NOT on the wire (a pack's
 * `AvailableMode.maxPlayers` is feasibility-derived and pack-specific;
 * `minPlayers` never travels at all), hand-mirrored from each mode's own
 * `*.descriptor.ts` in velanto-backend. See room-types.ts's own D5 note in
 * the implementation plan for how these were sourced.
 */
export const ROOM_MODE_BOUNDS: Record<
  RoomMode,
  { formats: PackFormat[]; minPlayers: number; maxPlayers: number }
> = {
  claim: { formats: ["save_one", "sacrifice_one"], minPlayers: 2, maxPlayers: 4 },
  guess_who: {
    formats: ["save_one", "sacrifice_one", "rank_blind", "nxn", "1v1"],
    minPlayers: 3,
    maxPlayers: 8,
  },
  turn_based_cut: {
    formats: ["save_one", "sacrifice_one"],
    minPlayers: 2,
    maxPlayers: 6,
  },
  voting: {
    formats: ["save_one", "sacrifice_one", "nxn", "1v1"],
    minPlayers: 2,
    maxPlayers: 12,
  },
  shared_grid: { formats: ["rank_blind"], minPlayers: 2, maxPlayers: 12 },
  relay: { formats: ["rank_blind"], minPlayers: 2, maxPlayers: 6 },
};

/** Whether a specific pack can run a mode, and up to what roster size. */
export interface ModeFeasibility {
  available: boolean;
  maxPlayers: number;
  reason?: string;
}

/** A mode offered for a pack's format, with this pack's feasibility folded in. */
export interface AvailableMode extends ModeFeasibility {
  mode: RoomMode;
}

/**
 * Master switch for the whole live-room surface, and the ONE line to flip when
 * rooms return. Every room ENTRY POINT reads this so users are never offered a
 * flow that cannot succeed:
 *
 *  - {@link ../home/JoinRoomCard} renders nothing while dormant;
 *  - {@link ./friends-rooms-presence-context} skips its `/mine` poll;
 *  - {@link ./JoinByLink} (the `/rooms/join/[code]` landing) lands straight on
 *    its "not found" state instead of bouncing a signed-out visitor through
 *    sign-in to a guaranteed 404;
 *  - {@link ../pack/PackDetailScreen} does not render `FriendsRoomEntry`.
 *
 * Flipped to `false` in the final task of the rooms-UI implementation plan,
 * once every mode's lobby/round/results path is built and e2e-verified.
 */
export const ROOMS_DORMANT: boolean = true;

export type FriendsRoomStatus = "lobby" | "playing" | "finished" | "abandoned";

export const ROOM_PHASES = [
  "lobby",
  "round",
  "between",
  /** The interactive Guess-who endgame — assign real players to anonymous
   * labels. Entered only when the room's mode declares one; Claim/Voting/
   * Turn-based-cut/Shared-grid/Relay go straight from `between` to `finished`. */
  "guessing",
  "finished",
  "abandoned",
] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];

export interface RoomPlayerState {
  userId: string;
  username: string;
  avatarKey: string | null;
  seat: number;
  connected: boolean;
  ready: boolean;
  next: boolean;
  claimedItemId: string | null;
}

export interface RoundState {
  index: number;
  name: string;
  items: Item[];
  /** Claim mode: { [userId]: itemId } as it stands right now. Empty otherwise. */
  claims: Record<string, string>;
  /** Claim mode: null until the round resolves. */
  survivorItemId: string | null;
  /** Guess-who mode: the ids a player selects among, and how. Absent otherwise. */
  optionIds?: string[];
  actionKind?: "pick" | "rank";
  /** Guess-who and Shared-grid: userIds who have locked in a BLIND
   * selection/ranking this round — never the picks/rankings themselves. */
  lockedIn?: string[];
  /** Turn-based cut: the ids still in play, shrinking with every cut. */
  remainingItemIds?: string[];
  /** Turn-based cut: whose turn it is right now, or null once resolved. */
  turnUserId?: string | null;
  /** Turn-based cut: every cut so far THIS round, in order — public. */
  cuts?: { userId: string; itemId: string }[];
  /** Voting: { [userId]: optionId } — live and FULLY PUBLIC (unlike
   * guess-who's blind lockedIn). */
  votes?: Record<string, string>;
  /** Voting: who holds tiebreak priority THIS round. */
  priorityUserId?: string | null;
  /** Relay: the round's fixed item-reveal order, set once at round start. */
  relayOrder?: string[];
  /** Relay: the shared ranking built SO FAR, in final relative order — fully
   * public, grows by one every placement. */
  relayPlaced?: string[];
  /** Relay: the item id currently awaiting placement, or null once every
   * item in the round has been placed. */
  relayCurrentItemId?: string | null;
  /** Relay: every placement so far THIS round, in order — fully public. */
  relayPlacements?: { userId: string; itemId: string }[];
}

/** Claim's resolved round — one unclaimed survivor. */
export interface SurvivorRoundResult {
  kind: "survivor";
  index: number;
  name: string;
  items: Item[];
  claims: Record<string, string>;
  survivorItemId: string;
  /** Turn-based cut: every cut made this round, in order. Undefined for Claim. */
  cuts?: { userId: string; itemId: string }[];
}

/** Guess-who's resolved round — every anonymous label's pick this round, no winner. */
export interface RevealRoundResult {
  kind: "reveal";
  index: number;
  name: string;
  items: Item[];
  /** label -> a length-1 array (pick formats) or the full ordering (rank_blind). */
  picks: Record<string, string[]>;
}

/** Voting's resolved round. */
export interface VoteRoundResult {
  kind: "vote";
  index: number;
  name: string;
  items: Item[];
  optionIds: string[];
  votes: Record<string, string>;
  tally: Record<string, number>;
  winnerOptionId: string;
  tieBroken: boolean;
  priorityUserId: string;
}

/** Shared-grid's resolved round — Borda-aggregated. */
export interface BordaRoundResult {
  kind: "borda";
  index: number;
  name: string;
  items: Item[];
  scores: Record<string, number>;
  /** Descending rank tiers — order[0] is 1st place; a tier holds >1 id on a
   * genuine tie. */
  order: string[][];
  ballots: Record<string, string[]>;
}

/** Relay's resolved round — the one shared ranking the room built together. */
export interface RelayRoundResult {
  kind: "relay";
  index: number;
  name: string;
  items: Item[];
  /** Final shared order, item ids, 1st place first. Never tiered. */
  order: string[];
  placements: { userId: string; itemId: string }[];
}

export type RoundResult =
  | SurvivorRoundResult
  | RevealRoundResult
  | VoteRoundResult
  | BordaRoundResult
  | RelayRoundResult;

/** The live guessing phase's public board. */
export interface GuessingState {
  /** Canonical P1..Pn order (never seat order). */
  labels: string[];
  /** The real userIds a label may be assigned to. */
  candidateUserIds: string[];
  /** Who has submitted. Never the mappings themselves. */
  submitted: string[];
}

/** The endgame reveal's public half — the true mapping only, never anyone's guess. */
export interface PublicEndgameState {
  kind: "identity_reveal";
  mapping: Record<string, string>;
}

export interface RoomState {
  id: string;
  code: string | null;
  packId: string;
  packTitle: string;
  hostId: string;
  status: FriendsRoomStatus;
  phase: RoomPhase;
  locked: boolean;
  /** The mode the host chose in the lobby, or null before one is set. */
  mode: RoomMode | null;
  /** Every mode this pack's format offers, each with this pack's feasibility. */
  availableModes: AvailableMode[];
  maxPlayers: number;
  totalRounds: number;
  roundIndex: number;
  /** Epoch ms the room advances itself, or null. Carries the between-round
   * auto-next deadline OR (in `guessing`) the reveal deadline. */
  autoNextAt: number | null;
  players: RoomPlayerState[];
  round: RoundState | null;
  results: RoundResult[];
  /** The live guessing-phase board, or null outside `phase === 'guessing'`. */
  guessing: GuessingState | null;
  /** The identity reveal once the guessing phase has closed. Null before
   * then, and forever for a mode with no endgame. */
  endgame: PublicEndgameState | null;
  /** THE CALLER'S OWN submitted mapping, and nobody else's. Populated only on
   * the per-caller read (initial `room.state`), never on a room-wide event. */
  myGuess: Record<string, string> | null;
}

export interface MyRoomSummary {
  id: string;
  packTitle: string;
  status: FriendsRoomStatus;
  players: { userId: string; username: string; avatarKey: string | null }[];
}

// ---------------------------------------------------------------- Rejections

export type ClaimRejectionReason =
  "taken" | "too_fast" | "not_in_round" | "round_not_active" | "not_a_player";
export interface ClaimRejection {
  itemId: string;
  reason: ClaimRejectionReason;
  claims: Record<string, string>;
}

export type CutRejectionReason =
  "not_your_turn" | "not_in_round" | "round_not_active" | "not_a_player";
export interface CutRejection {
  itemId: string;
  reason: CutRejectionReason;
  turnUserId: string | null;
}

export type GuessWhoRejectionReason =
  "not_in_round" | "round_not_active" | "not_a_player" | "malformed";
export interface GuessWhoRejection {
  selection: string[];
  reason: GuessWhoRejectionReason;
}

export type VoteRejectionReason =
  "not_in_round" | "round_not_active" | "not_a_player";
export interface VoteRejection {
  optionId: string;
  reason: VoteRejectionReason;
}

export type SharedGridRejectionReason =
  "round_not_active" | "not_a_player" | "malformed";
export interface SharedGridRejection {
  ranking: string[];
  reason: SharedGridRejectionReason;
}

export type RelayRejectionReason =
  "not_your_turn" | "not_in_round" | "round_not_active" | "not_a_player";
export interface RelayRejection {
  itemId: string;
  position: number;
  reason: RelayRejectionReason;
  turnUserId: string | null;
}

export type GuessRejectionReason = "not_a_player" | "not_guessing" | "malformed";
export interface GuessRejection {
  mapping: Record<string, string>;
  reason: GuessRejectionReason;
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
  modeChanged: "room.modeChanged",
  roundStarted: "round.started",
  claimUpdated: "claim.updated",
  claimRejected: "claim.rejected",
  itemCut: "item.cut",
  cutRejected: "cut.rejected",
  pickLocked: "pick.locked",
  pickRejected: "pick.rejected",
  voteCast: "vote.cast",
  voteRejected: "vote.rejected",
  rankingLocked: "ranking.locked",
  rankingRejected: "ranking.rejected",
  itemPlaced: "item.placed",
  placeRejected: "place.rejected",
  roundResolved: "round.resolved",
  playerNext: "player.next",
  gameFinished: "game.finished",
  roomClosed: "room.closed",
  guessingStarted: "guessing.started",
  guessSubmitted: "guess.submitted",
  guessRejected: "guess.rejected",
  identityRevealed: "identity.revealed",
} as const;

/** Client → server verbs. */
export const ROOM_COMMANDS = {
  claim: "claim",
  cut: "cut",
  pick: "pick",
  vote: "vote",
  submitRanking: "submitRanking",
  placeItem: "placeItem",
  ready: "ready",
  next: "next",
  leave: "leave",
  lock: "lock",
  kick: "kick",
  setMode: "setMode",
  guess: "guess",
} as const;
