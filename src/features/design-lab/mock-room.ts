import type { PackFormat } from "@/src/shared/types/pack";
import type {
  RoomMode,
  RoomPlayerState,
  RoomState,
} from "@/src/features/friends-rooms/room-types";
import {
  ROUND_COUNT,
  closedRound,
  liveRound,
  modesFor,
  optionIdsFor,
} from "./mock-rounds";

/**
 * Hand-built room snapshots for the design lab (`/design/rooms/*`).
 *
 * The lab exists so a room screen can be redesigned WITHOUT a backend, a pack,
 * several browser profiles and a game played to the right beat. Everything here
 * is fabricated: no fetch, no socket, no auth. It is a fixture, not a fallback
 * — nothing in the real room surface may import it.
 *
 * The shapes are the real wire shapes (`RoomState` from room-types), so a
 * screen that renders here renders in a real room. That is the whole point: the
 * lab must break when the contract changes, not quietly drift from it.
 *
 * The per-round data lives in `mock-rounds`; this file is the room around it.
 */

/**
 * The formats the lab offers, and between them every one of the seven modes:
 * the elimination formats cover Claim, Turn-based cut, Voting, Guess-who and
 * Spy; rank_blind covers Shared-grid and Relay; the versus formats cover the
 * arms where an option stops being an item.
 *
 * Both elimination formats are here rather than one: they run the same modes
 * and differ only in a verb ("save" vs "sacrifice"), which is exactly the kind
 * of difference that is invisible until the two screens sit side by side.
 */
export const LAB_FORMATS = [
  "1v1",
  "nxn",
  "sacrifice_one",
  "save_one",
  "rank_blind",
] as const satisfies readonly PackFormat[];

export type LabFormat = (typeof LAB_FORMATS)[number];

/** English-only, like the rest of the lab — see DesignLabBar. */
export const FORMAT_LABEL: Record<LabFormat, string> = {
  "1v1": "1v1",
  nxn: "NxN",
  sacrifice_one: "Sacrifice",
  save_one: "Save",
  rank_blind: "Rank blind",
};

export const MODE_LABEL: Record<RoomMode, string> = {
  claim: "Claim",
  guess_who: "Guess-who",
  turn_based_cut: "Turn cut",
  voting: "Voting",
  shared_grid: "Shared grid",
  relay: "Relay",
  spy: "Spy",
};

export interface MockOptions {
  format?: LabFormat;
  /**
   * Render Spy as the SPY sees it — no accusation to make, just the evidence
   * and a wait. In a real room you can only reach it by being dealt the role.
   */
  asSpy?: boolean;
}

/** Four seats — enough for a split vote and for Spy's accusation maths. */
export const LAB_PLAYERS: RoomPlayerState[] = [
  { userId: "u1", username: "Alice", seat: 0, label: "P2" },
  { userId: "u2", username: "Bogdan", seat: 1, label: "P1" },
  { userId: "u3", username: "Cara", seat: 2, label: "P4" },
  { userId: "u4", username: "Devrim", seat: 3, label: "P3" },
].map((seat) => ({
  ...seat,
  avatarKey: null,
  connected: true,
  ready: true,
  // One player has already pressed Next, so the "1 / 4" on the advance button
  // and its enabled state are both visible in the same screenshot.
  next: seat.userId === "u3",
  claimedItemId: null,
}));

/**
 * Which option each seat leans toward, per round. Read by `pickedOptionId`.
 *
 * A pattern, not noise: two players who move together, one contrarian, one who
 * drifts. Every deduction screen in the room is read off exactly this, so a
 * mock whose picks carry no pattern would make those screens look like they
 * work while the thing they exist for was missing.
 */
export const PICK_SEED: Record<string, number[]> = {
  u1: [0, 1, 0, 0, 1],
  u2: [0, 0, 0, 1, 1],
  u3: [1, 1, 1, 0, 0],
  u4: [0, 1, 0, 0, 1],
};

/** The viewer. Alice, so `mine`/"you" treatments show up. */
export const MOCK_VIEWER_ID = "u1";

/** Whoever the room accuses at the end. Cara, the contrarian — the one a
 * player reading the pick table would actually land on. */
export const MOCK_SPY_USER_ID = "u3";

const LABELS = LAB_PLAYERS.map((p) => p.label)
  .filter((label): label is string => label !== null)
  .sort();

/** Which anonymous label each seat holds — the reveal's public mapping. */
const TRUE_MAPPING = Object.fromEntries(
  LAB_PLAYERS.filter((p) => p.label).map((p) => [p.label as string, p.userId]),
);

/**
 * The viewer's own submitted mapping — deliberately PART right.
 *
 * All-correct or all-wrong would each hide half of what the reveal draws: it
 * grades every label separately, and a mock that scores 4/4 never shows the
 * failure state at all.
 */
const MY_GUESS: Record<string, string> = {
  P1: "u2", // right
  P2: "u1", // your own label, filled in for you
  P3: "u3", // wrong — actually Devrim
  P4: "u4", // wrong — actually Cara
};

/** Every mode this format offers, straight from the room model. */
export function labModes(format: LabFormat): RoomMode[] {
  return modesFor(format);
}

/** The modes with an endgame — the only ones that reach `phase: "guessing"`. */
export function labGuessingModes(format: LabFormat): RoomMode[] {
  return labModes(format).filter(
    (mode) => mode === "guess_who" || mode === "spy",
  );
}

/** Everything a room carries regardless of which beat it is paused on. */
function baseRoom(mode: RoomMode, format: LabFormat): Omit<RoomState, "phase"> {
  return {
    id: "design-lab",
    code: "DESIGN",
    packId: "pack-design-lab",
    packTitle: "Greatest Shots in Modern Cinema",
    packFormat: format,
    packRounds: ROUND_COUNT,
    packAuthorUsername: "velanto",
    packCoverTone: "#7c3aed",
    packCoverImageKey: null,
    hostId: "u1",
    status: "playing",
    locked: true,
    mode,
    availableModes: labModes(format).map((m) => ({
      mode: m,
      available: true,
      maxPlayers: 8,
    })),
    maxPlayers: 8,
    totalRounds: ROUND_COUNT,
    roundIndex: 0,
    autoNextAt: null,
    players: LAB_PLAYERS,
    round: null,
    results: [],
    labels: null,
    guessing: null,
    endgame: null,
    myGuess: null,
    iAmSpy: null,
    myAccusation: null,
  };
}

/** Round 3 of 5 — mid-game, so the header and progress read as a real session. */
const BETWEEN_ROUND_INDEX = 2;

/**
 * A room paused on the between-round beat.
 *
 * `results` ends with the round `state.round` points at — the exact invariant
 * every between-round board reads (each one looks its own result up by `index`
 * and renders nothing if it is missing).
 */
export function mockBetweenRoom(
  mode: RoomMode,
  { format = "1v1" }: MockOptions = {},
): RoomState {
  const round = liveRound(format, mode, BETWEEN_ROUND_INDEX);
  const results = Array.from({ length: BETWEEN_ROUND_INDEX + 1 }, (_, i) =>
    closedRound(format, mode, i),
  );
  const closed = results[results.length - 1];
  return {
    ...baseRoom(mode, format),
    phase: "between",
    roundIndex: BETWEEN_ROUND_INDEX,
    // A live deadline so the auto-next countdown actually counts. Read at call
    // time, not module load, or a page left open would show a frozen 0.
    autoNextAt: Date.now() + 12_000,
    round: {
      ...round,
      // Claim and Turn-based cut draw their between screen from the LIVE
      // round rather than from the result, so the survivor and the claims have
      // to be carried back onto it — which is what the server does when it
      // resolves one.
      ...(closed.kind === "survivor"
        ? {
            claims: closed.claims,
            survivorItemId: closed.survivorItemId,
            ...(closed.cuts ? { cuts: closed.cuts } : {}),
          }
        : {}),
    },
    results,
    labels: mode === "guess_who" ? LABELS : null,
    iAmSpy: mode === "spy" ? false : null,
  };
}

/**
 * A room in its endgame: every round played, and the room now naming names.
 *
 * Guess-who assigns each anonymous label to a real player; Spy has no labels at
 * all and asks for one accusation. Both ride the same `guessing` state, which
 * is why `labels` being empty is meaningful rather than missing.
 */
export function mockGuessingRoom(
  mode: RoomMode,
  { format = "1v1", asSpy = false }: MockOptions = {},
): RoomState {
  const isGuessWho = mode === "guess_who";
  return {
    ...baseRoom(mode, format),
    phase: "guessing",
    roundIndex: ROUND_COUNT - 1,
    // Minutes, not seconds: this phase's deadline is a real thinking window,
    // and the m:ss clock reads wrong when it opens near zero.
    autoNextAt: Date.now() + 4 * 60_000 + 12_000,
    round: liveRound(format, mode, ROUND_COUNT - 1),
    results: Array.from({ length: ROUND_COUNT }, (_, i) =>
      closedRound(format, mode, i),
    ),
    labels: isGuessWho ? LABELS : null,
    guessing: {
      labels: isGuessWho ? LABELS : [],
      // Spy's candidates are the people you may accuse; Guess-who's are the
      // people a label may be assigned to. Same field, same roster.
      candidateUserIds: LAB_PLAYERS.map((p) => p.userId),
      // One player is already in, so the "waiting for others" line has a real
      // number under it rather than a zero.
      submitted: ["u2"],
    },
    iAmSpy: isGuessWho ? null : asSpy,
  };
}

/**
 * A finished game.
 *
 * The five shared-verdict modes have no endgame and fall to the round-by-round
 * summary; Guess-who and Spy each reveal what they had been hiding all game.
 * Both of those carry a `scores` board and a per-viewer grading of the viewer's
 * OWN answer, which is why `myGuess` / `myAccusation` are set here and never on
 * a room-wide payload.
 */
export function mockResultsRoom(
  mode: RoomMode,
  { format = "1v1", asSpy = false }: MockOptions = {},
): RoomState {
  const guessWho = mode === "guess_who";
  const spyReveal = mode === "spy";
  return {
    ...baseRoom(mode, format),
    phase: "finished",
    status: "finished",
    roundIndex: ROUND_COUNT - 1,
    round: null,
    results: Array.from({ length: ROUND_COUNT }, (_, i) =>
      closedRound(format, mode, i),
    ),
    labels: guessWho ? LABELS : null,
    endgame: guessWho
      ? {
          kind: "identity_reveal",
          mapping: TRUE_MAPPING,
          // Nobody's own label is scored, so 3 is a perfect round of four.
          scores: { u1: 1, u2: 3, u3: 2, u4: 1 },
        }
      : spyReveal
        ? {
            kind: "spy_reveal",
            spyUserId: MOCK_SPY_USER_ID,
            // Half the board, rounded down. On a two-option round that is the
            // one option the spy did NOT take — they could only ever pick what
            // they could see.
            hiddenByRound: Array.from({ length: ROUND_COUNT }, (_, index) => {
              const ids = optionIdsFor(format, index);
              const taken = PICK_SEED[MOCK_SPY_USER_ID][index] % ids.length;
              return ids
                .filter((_, i) => i !== taken)
                .slice(0, ids.length - Math.floor(ids.length / 2));
            }),
            // Two of the three accusers named Cara; the third looked elsewhere,
            // which is the spy's single point.
            scores: { u1: 1, u2: 1, u3: 1, u4: 0 },
          }
        : null,
    myGuess: guessWho ? MY_GUESS : null,
    // The viewer called it right. The spy never accused at all, so theirs is
    // null — and note that SpyRevealScreen decides who is looking from
    // `currentUserId === endgame.spyUserId`, not from `iAmSpy`: after the
    // reveal the role is public, so there is nothing per-viewer left to read.
    // Which is why the lab hands it MOCK_SPY_USER_ID rather than a flag.
    myAccusation: spyReveal && !asSpy ? MOCK_SPY_USER_ID : null,
    iAmSpy: spyReveal ? asSpy : null,
  };
}
