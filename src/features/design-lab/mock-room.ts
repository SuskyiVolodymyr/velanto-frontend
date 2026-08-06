import type { Item } from "@/src/shared/types/pack";
import type {
  RoomMode,
  RoomPlayerState,
  RoomState,
  RoundResult,
  RoundState,
} from "@/src/features/friends-rooms/room-types";

/**
 * Hand-built room snapshots for the design lab (`/design/rooms/*`).
 *
 * The lab exists so a room screen can be redesigned WITHOUT a backend, a pack,
 * three browser profiles and a game played to the right beat. Everything here
 * is fabricated: no fetch, no socket, no auth. It is a fixture, not a fallback
 * — nothing in the real room surface may import it.
 *
 * The shapes are the real wire shapes (`RoomState` from room-types), so a
 * screen that renders here renders in a real room. That is the whole point: the
 * lab must break when the contract changes, not quietly drift from it.
 */

/** The modes a `1v1` pack can actually run — see ROOM_MODE_BOUNDS. */
export const MODES_1V1 = [
  "voting",
  "guess_who",
  "spy",
] as const satisfies readonly RoomMode[];

export type Mode1v1 = (typeof MODES_1V1)[number];

/**
 * The two contenders. YouTube items rather than text: a 1v1 round is a media
 * matchup, and a mock made of bare titles would flatter any layout put on it.
 * These render straight from YouTube's thumbnail CDN, so the lab needs no S3.
 */
const LEFT: Item = {
  id: "item-left",
  type: "youtube",
  title: "Interstellar — Docking Scene",
  value: "https://www.youtube.com/watch?v=hxYmvHgLGlA",
};

const RIGHT: Item = {
  id: "item-right",
  type: "youtube",
  title: "Blade Runner 2049 — Sea Wall",
  value: "https://www.youtube.com/watch?v=gCcx85zbxz4",
};

const ITEMS = [LEFT, RIGHT];

/** Four seats — enough for a split vote and for Spy's accusation maths. */
const PLAYERS: RoomPlayerState[] = [
  { userId: "u1", username: "Alice", seat: 0, label: "P2" },
  { userId: "u2", username: "Bogdan", seat: 1, label: null },
  { userId: "u3", username: "Cara", seat: 2, label: null },
  { userId: "u4", username: "Devrim", seat: 3, label: null },
].map((seat) => ({
  ...seat,
  avatarKey: null,
  connected: true,
  ready: true,
  // One player has already pressed Next, so the "1 / 4 ready" line and the
  // disabled/enabled Next button are both visible in the same screenshot.
  next: seat.userId === "u3",
  claimedItemId: null,
}));

/** The viewer. Alice, so `mine`/`your pick` treatments show up. */
export const MOCK_VIEWER_ID = "u1";

/** Round 3 of 5 — mid-game, so the header and progress read as a real session. */
const ROUND_INDEX = 2;

const ROUND: RoundState = {
  index: ROUND_INDEX,
  name: "Round 3 · Cinematography",
  items: ITEMS,
  claims: {},
  survivorItemId: null,
  optionIds: [LEFT.id, RIGHT.id],
  actionKind: "pick",
};

/** Who picked what, this round. Deliberately 3–1: a clear result with a dissenter. */
const PICKS: Record<string, string> = {
  u1: LEFT.id,
  u2: LEFT.id,
  u3: RIGHT.id,
  u4: LEFT.id,
};

const TALLY: Record<string, number> = {
  [LEFT.id]: 3,
  [RIGHT.id]: 1,
};

/** Guess-who keys its picks by anonymous LABEL; Spy and Voting by real userId. */
const LABEL_PICKS: Record<string, string[]> = {
  P1: [LEFT.id],
  P2: [LEFT.id],
  P3: [RIGHT.id],
  P4: [LEFT.id],
};

/**
 * The two rounds already behind this one. Only the LAST result drives a
 * between-round board, but the earlier ones are what a history table (and
 * Guess-who's label set) reads, so the lab carries them.
 */
function priorRounds(mode: Mode1v1): RoundResult[] {
  return [0, 1].map((index) => closedRound(mode, index, index === 0));
}

function closedRound(
  mode: Mode1v1,
  index: number,
  leftWon: boolean,
): RoundResult {
  const winner = leftWon ? LEFT.id : RIGHT.id;
  const loser = leftWon ? RIGHT.id : LEFT.id;
  const name = index === ROUND_INDEX ? ROUND.name : `Round ${index + 1}`;
  const base = { index, name, items: ITEMS };

  switch (mode) {
    case "voting":
      return {
        ...base,
        kind: "vote",
        optionIds: [LEFT.id, RIGHT.id],
        votes:
          index === ROUND_INDEX
            ? PICKS
            : { u1: winner, u2: winner, u3: loser, u4: winner },
        tally: index === ROUND_INDEX ? TALLY : { [winner]: 3, [loser]: 1 },
        winnerOptionId: index === ROUND_INDEX ? LEFT.id : winner,
        tieBroken: false,
        priorityUserId: "u2",
      };
    case "guess_who":
      return {
        ...base,
        kind: "reveal",
        picks:
          index === ROUND_INDEX
            ? LABEL_PICKS
            : { P1: [winner], P2: [winner], P3: [loser], P4: [winner] },
      };
    case "spy":
      return {
        ...base,
        kind: "spy_round",
        picks:
          index === ROUND_INDEX
            ? Object.fromEntries(
                Object.entries(PICKS).map(([userId, id]) => [userId, [id]]),
              )
            : { u1: [winner], u2: [winner], u3: [loser], u4: [winner] },
      };
  }
}

/**
 * A room paused on the between-round beat of a 1v1 pack, in the given mode.
 *
 * `phase` is "between" and `results` ends with the round `state.round` points
 * at — the exact invariant every between-round board reads (each one looks up
 * its own result by `index`, and renders nothing if it is missing).
 */
export function mock1v1BetweenRoom(mode: Mode1v1): RoomState {
  return {
    id: "design-lab",
    code: "DESIGN",
    packId: "pack-design-lab",
    packTitle: "Greatest Shots in Modern Cinema",
    packFormat: "1v1",
    packRounds: 5,
    packAuthorUsername: "velanto",
    packCoverTone: "#7c3aed",
    packCoverImageKey: null,
    hostId: "u1",
    status: "playing",
    phase: "between",
    locked: true,
    mode,
    availableModes: MODES_1V1.map((m) => ({
      mode: m,
      available: true,
      maxPlayers: 8,
    })),
    maxPlayers: 8,
    totalRounds: 5,
    roundIndex: ROUND_INDEX,
    // A live deadline so the auto-next countdown actually counts. Read at call
    // time, not module load, or a page left open would show a frozen 0.
    autoNextAt: Date.now() + 12_000,
    players: PLAYERS,
    round: ROUND,
    results: [...priorRounds(mode), closedRound(mode, ROUND_INDEX, true)],
    labels: mode === "guess_who" ? ["P1", "P2", "P3", "P4"] : null,
    guessing: null,
    endgame: null,
    myGuess: null,
    iAmSpy: mode === "spy" ? false : null,
    myAccusation: null,
  };
}
