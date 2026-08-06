import type { Item } from "@/src/shared/types/pack";
import type {
  RoomMode,
  RoundResult,
  RoundSide,
  RoundState,
} from "./room-types";

/**
 * The `round.resolved` wire payload — SIX different shapes behind one event
 * name, and deliberately UNTAGGED (the backend's `roundResolvedPayload`
 * switches on the result kind but does not put a `kind` on the wire). Only the
 * `index`/`autoNextAt` pair is common to all six, so every other field is
 * optional here and the room's own `mode` is what discriminates them.
 */
export interface RoundResolvedPayload {
  index: number;
  autoNextAt: number | null;
  /** survivor (claim, turn_based_cut) */
  survivorItemId?: string;
  claims?: Record<string, string>;
  /** turn_based_cut only */
  cuts?: { userId: string; itemId: string }[];
  /** reveal (guess_who) */
  picks?: Record<string, string[]>;
  /** vote (voting) */
  optionIds?: string[];
  votes?: Record<string, string>;
  tally?: Record<string, number>;
  winnerOptionId?: string;
  tieBroken?: boolean;
  priorityUserId?: string;
  /** borda (shared_grid) */
  scores?: Record<string, number>;
  ballots?: Record<string, string[]>;
  /** Borda's tiered order (`string[][]`) OR Relay's flat one (`string[]`). */
  order?: string[][] | string[];
  /** relay */
  placements?: { userId: string; itemId: string }[];
  /**
   * spy only: the resolved round's REAL board.
   *
   * Every other mode's client already holds the full round it was playing and
   * can name a winner from what it has. The spy's copy has holes in it — the
   * server sends the whole thing here because a resolved round is public, and
   * this is the moment those holes are allowed to be filled.
   */
  items?: Item[];
  sides?: RoundSide[];
}

/**
 * Assemble the resolved round into the `RoundResult` its between-round board
 * and the results screen actually read.
 *
 * The event names the outcome but never the board — the client already holds
 * `name`/`items` in `round` — so the result is built from both, which is why
 * this takes the live round rather than the payload alone.
 *
 * Returns null when the payload cannot be honestly assembled (no mode yet, or
 * a shape missing the one field its kind is defined by). Null means "keep the
 * result you already have"; it must never be turned into a fabricated
 * survivor, which is what synthesizing `kind: "survivor"` for all five shapes
 * used to do — a resolved Voting round became
 * `{ kind: "survivor", survivorItemId: undefined, claims: undefined }`, which
 * rendered a blank between-screen and could throw in RoomResults'
 * `Object.entries(result.claims)`.
 */
export function roundResultFromResolved(
  mode: RoomMode | null,
  round: Pick<RoundState, "index" | "name" | "items" | "sides">,
  payload: RoundResolvedPayload,
): RoundResult | null {
  const base = { index: payload.index, name: round.name, items: round.items };

  switch (mode) {
    // Both survivor modes ship the same shape; turn-based cut adds `cuts`,
    // which Claim leaves undefined (matching SurvivorRoundResult's optional).
    case "claim":
    case "turn_based_cut":
      if (payload.survivorItemId === undefined) return null;
      return {
        ...base,
        kind: "survivor",
        claims: payload.claims ?? {},
        survivorItemId: payload.survivorItemId,
        cuts: payload.cuts,
      };
    case "guess_who":
      if (payload.picks === undefined) return null;
      // `sides` comes from the ROUND, not the payload — an nxn pick names a
      // pool, and the event ships only the picks. Same reason `name`/`items`
      // are taken from the round: the client already holds the board. Without
      // it every live table printed raw group ids, while the results screen
      // (which the server rebuilds from the pack) read correctly.
      return {
        ...base,
        kind: "reveal",
        picks: payload.picks,
        ...(round.sides ? { sides: round.sides } : {}),
      };
    case "spy":
      if (payload.picks === undefined) return null;
      return {
        ...base,
        kind: "spy_round",
        // The RESOLVED board wins over the one the viewer was playing. For
        // everyone but the spy they are the same; for the spy this is what
        // un-redacts the round they just played half-blind.
        items: payload.items ?? round.items,
        picks: payload.picks,
        ...(payload.sides ?? round.sides
          ? { sides: payload.sides ?? round.sides }
          : {}),
      };
    case "voting":
      if (payload.winnerOptionId === undefined) return null;
      return {
        ...base,
        kind: "vote",
        optionIds: payload.optionIds ?? [],
        votes: payload.votes ?? {},
        tally: payload.tally ?? {},
        winnerOptionId: payload.winnerOptionId,
        tieBroken: payload.tieBroken ?? false,
        priorityUserId: payload.priorityUserId ?? "",
      };
    case "shared_grid":
      if (payload.order === undefined) return null;
      return {
        ...base,
        kind: "borda",
        scores: payload.scores ?? {},
        // Shared-grid's order is TIERED — order[0] is the 1st-place tier,
        // which holds more than one id on a genuine tie.
        order: payload.order as string[][],
        ballots: payload.ballots ?? {},
      };
    case "relay":
      if (payload.order === undefined) return null;
      return {
        ...base,
        kind: "relay",
        // Relay's order is flat: one shared ranking, never tiered.
        order: payload.order as string[],
        placements: payload.placements ?? [],
      };
    default:
      return null;
  }
}
