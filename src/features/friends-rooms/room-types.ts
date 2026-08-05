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
  "spy",
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
  claim: {
    formats: ["save_one", "sacrifice_one"],
    minPlayers: 2,
    maxPlayers: 4,
  },
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
  // Four is the highest floor of any mode: at three players the accusation is
  // one spy and two accusers guessing between two names, which is a coin flip
  // rather than a deduction.
  spy: {
    formats: ["save_one", "sacrifice_one", "nxn", "1v1"],
    minPlayers: 4,
    maxPlayers: 8,
  },
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
export const ROOMS_DORMANT: boolean = false;

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
  /**
   * Guess-who's anonymous label for this player, or null outside that mode and
   * before the game starts. The room panel renders it in place of the avatar
   * and the username, so the room reads as X / Y / Z all game.
   *
   * Owner-made tradeoff: this pairs a label with a userId on the wire, so the
   * masking is for the screen, not against someone reading the socket.
   */
  label: string | null;
  /**
   * True for a player who joined with a nickname rather than an account.
   *
   * The roster marks them, because a guest is a name typed into a box: there is
   * no profile behind it, and nothing stops a second person typing the same
   * one. Absent on snapshots from a backend that predates guests, so treat a
   * missing value as false rather than assuming it.
   */
  guest?: boolean;
}

/** What POST /friends-rooms/join-guest hands back. */
export interface GuestJoinResult {
  /**
   * A JWT bound to this one room. Not a session — no refresh, 12h, and every
   * other endpoint refuses it.
   */
  token: string;
  /** The guest's own user id, so the room can find itself in the roster. */
  guestId: string;
  room: RoomState;
}

/**
 * One side of a versus (nxn) round: a POOL picked as a whole, with the items
 * drawn from it as the matchup context. nxn is the one format whose options are
 * not items, so without this a board has option ids it cannot name.
 */
export interface RoundSide {
  id: string;
  name: string;
  itemIds: string[];
}

export interface RoundState {
  index: number;
  name: string;
  items: Item[];
  /** Claim mode: { [userId]: itemId } as it stands right now. Empty otherwise. */
  claims: Record<string, string>;
  /** Claim mode: null until the round resolves. */
  survivorItemId: string | null;
  /**
   * Guess-who, Voting, Shared-grid and Spy: the ids a player acts on, and how.
   * Absent otherwise.
   *
   * SPY is the one mode where this is not simply a slice of `items`: an option
   * the spy cannot see arrives as an opaque per-round TOKEN in its real slot,
   * and its item is absent from `items` entirely. So a board reads the shape of
   * the round from HERE and treats a missing item as "redacted" — which is why
   * the spy still knows how many options exist without learning what they are.
   */
  optionIds?: string[];
  actionKind?: "pick" | "rank";
  /** Guess-who and Voting on an NXN pack: what each option IS, since there an
   * option is a pool rather than an item. Absent for every other format. */
  sides?: RoundSide[];
  /** Guess-who and Shared-grid: userIds who have locked in a BLIND
   * selection/ranking this round — never the picks/rankings themselves. */
  lockedIn?: string[];
  /**
   * Guess-who only: each anonymous LABEL's pick this round, as it lands.
   * Live — the round is watchable while people choose. Which real player holds
   * a label is what stays hidden.
   */
  picks?: Record<string, string[]>;
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
  /** The ranking BOARD — one slot per item, `null` where still free. Fixed
   * length from the start, so every position is open to the first placement. */
  relayPlaced?: (string | null)[];
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
  /**
   * nxn only: what each picked id IS, since there a pick names a POOL and
   * resolves to nothing in `items`. Absent for every other format, where a
   * pick is already an item in `items`.
   */
  sides?: RoundSide[];
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

/**
 * Spy's resolved round - every seated player's pick, under their REAL userId.
 *
 * Not a reuse of `reveal`, whose picks are keyed by anonymous label: the two
 * look identical on the wire and mean opposite things. There is no winner
 * either - a Spy round has no shared verdict, so anything a screen shows as
 * "what the room went with" is the majority of `picks`, derived on the client.
 */
export interface SpyRoundResult {
  kind: "spy_round";
  index: number;
  name: string;
  items: Item[];
  /** userId -> a length-1 array. Always REAL option ids: a token from the
   * spy's redacted board is translated back before the round resolves. */
  picks: Record<string, string[]>;
  /** nxn only: what each picked id IS, since there a pick names a pool. */
  sides?: RoundSide[];
}

export type RoundResult =
  | SurvivorRoundResult
  | RevealRoundResult
  | VoteRoundResult
  | BordaRoundResult
  | RelayRoundResult
  | SpyRoundResult;

/** The live guessing phase's public board. */
export interface GuessingState {
  /** Canonical P1..Pn order (never seat order). */
  labels: string[];
  /** The real userIds a label may be assigned to. */
  candidateUserIds: string[];
  /** Who has submitted. Never the mappings themselves. */
  submitted: string[];
}

/** Guess-who's reveal — the true mapping only, never anyone's guess. */
export interface PublicIdentityRevealState {
  kind: "identity_reveal";
  mapping: Record<string, string>;
  /** guesser userId → how many labels they matched. The leaderboard. Absent
   * when the game ended without a reveal, which is not "zero for everyone". */
  scores?: Record<string, number>;
}

/**
 * Spy's reveal — who it was, what they could see each round, and the scores.
 *
 * `hiddenByRound` is held back for the whole GAME and arrives only here: mid-
 * game it would be the loudest possible tell ("the spy could only see A and B"
 * narrows the room to one or two people instantly). It is what makes the
 * results recap worth reading.
 *
 * Individual accusations never travel — a wrong one names a specific person.
 */
export interface PublicSpyRevealState {
  kind: "spy_reveal";
  spyUserId: string;
  /** Plan round index → the option ids the spy could not see that round. */
  hiddenByRound: string[][];
  /** userId → points: 1 for naming the spy, and for the spy 1 per accuser who
   * named somebody else. Absent when the game ended without a reveal. */
  scores?: Record<string, number>;
}

export type PublicEndgameState =
  | PublicIdentityRevealState
  | PublicSpyRevealState;

export interface RoomState {
  id: string;
  code: string | null;
  packId: string;
  packTitle: string;
  /** The pack's own identity, for the room header's caption. `packRounds` is
   * what the author wrote (known in the lobby); `totalRounds` is the drawn
   * plan, still 0 there. */
  packFormat: PackFormat;
  packRounds: number;
  packAuthorUsername: string | null;
  /**
   * The pack's cover, so the room header shows the pack you are playing.
   * `packCoverTone` seeds the gradient and is always sent; `packCoverImageKey`
   * is an uploaded cover's storage key, null when the author never set one.
   *
   * Both optional on the type, not because the server omits them, but because a
   * room snapshot can arrive from a backend that predates them — during a
   * deploy, the frontend is live before every socket has reconnected to the new
   * gateway. The header falls back to its old gradient rather than rendering
   * `linear-gradient(150deg, undefined, …)`.
   */
  packCoverTone?: string;
  packCoverImageKey?: string | null;
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
  /**
   * Guess-who's anonymous labels, SORTED — the set, never who holds which.
   * Null outside guess-who and before the game starts. This is what lets the
   * room panel show X / Y / Z from round one instead of everyone's real names,
   * which is the mode's whole fiction.
   */
  labels: string[] | null;
  /** The live guessing-phase board, or null outside `phase === 'guessing'`. */
  guessing: GuessingState | null;
  /** The identity reveal once the guessing phase has closed. Null before
   * then, and forever for a mode with no endgame. */
  endgame: PublicEndgameState | null;
  /** THE CALLER'S OWN submitted mapping, and nobody else's. Populated only on
   * the per-caller read (initial `room.state`), never on a room-wide event. */
  myGuess: Record<string, string> | null;
  /**
   * Is the VIEWER the spy? Per-caller like `myGuess`, and null both outside a
   * spy game and on any room-wide payload — the two are indistinguishable on
   * purpose, so a non-spy cannot tell a room before the role is assigned from
   * one where somebody else holds it.
   */
  iAmSpy?: boolean | null;
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

export type SpyPickRejectionReason =
  | "not_in_round"
  | "round_not_active"
  | "not_a_player";
export interface SpyPickRejection {
  optionId: string;
  reason: SpyPickRejectionReason;
}

export type SpyAccusationRejectionReason =
  | "not_a_player"
  | "not_accusing"
  | "malformed"
  | "is_spy";
export interface SpyAccusationRejection {
  userId: string;
  reason: SpyAccusationRejectionReason;
}

export type GuessRejectionReason =
  "not_a_player" | "not_guessing" | "malformed";
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
  /**
   * Spy: a player locked their pick — `{ userId, optionId }`, public and under
   * the real name. The ONE event whose payload differs per recipient: an
   * optionId the spy cannot see reaches them as that option's opaque token.
   */
  spyPicked: "spy.picked",
  spyPickRejected: "spy.pickRejected",
  /** Spy: somebody submitted an accusation — `{ userId }`, never whom. */
  accusationSubmitted: "accusation.submitted",
  accusationRejected: "accusation.rejected",
  /** Spy's reveal, per player: `{ spyUserId, hiddenByRound, yourAccusation }`. */
  spyRevealed: "spy.revealed",
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
  /** Host-only: begin the game. Ready is consent; this is the trigger. */
  start: "start",
  next: "next",
  leave: "leave",
  lock: "lock",
  kick: "kick",
  setMode: "setMode",
  guess: "guess",
  /** Spy: pick one option. What the SPY sends may be a token, not an item id. */
  spyPick: "spyPick",
  /** Spy: name one player as the spy. Non-spies only. */
  accuse: "accuse",
} as const;
