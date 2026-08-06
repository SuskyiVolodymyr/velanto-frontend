import type { Item } from "@/src/shared/types/pack";
import type {
  RoomMode,
  RoundResult,
  RoundSide,
  RoundState,
} from "@/src/features/friends-rooms/room-types";
import { ROOM_MODE_BOUNDS } from "@/src/features/friends-rooms/room-types";
import type { LabFormat } from "./mock-room";
import { LAB_PLAYERS, PICK_SEED } from "./mock-room";

/**
 * The lab's round factory — one live board and one resolved result per
 * (format, mode), for every combination the room model actually allows.
 *
 * Split out of `mock-room` because it is the bulk of the fixture and the only
 * part that has to know how each of the seven modes records a round. The room
 * wrapper around it (roster, phase, endgame) is the same for all of them.
 *
 * Every shape here is the real wire shape, so a mode whose result contract
 * changes breaks this file rather than silently drifting from it.
 */

function youtube(id: string, title: string): Item {
  return { id, type: "youtube", title, value: `https://youtu.be/${id}` };
}

/**
 * A bank of clips, drawn from per round.
 *
 * YouTube rather than text: these boards are media boards, and a mock made of
 * bare titles would flatter any layout put on it. They render from YouTube's
 * thumbnail CDN, so the lab needs no S3.
 */
const CLIPS: Item[] = [
  youtube("hxYmvHgLGlA", "Interstellar — Docking"),
  youtube("gCcx85zbxz4", "Blade Runner 2049 — Sea Wall"),
  youtube("EXeTwQWrcwY", "The Dark Knight — Truck Flip"),
  youtube("_lK4cX5xGiQ", "Mad Max — Convoy"),
  youtube("UXqq0ZvbOnk", "Parasite — The Flood"),
  youtube("aiSdCQi7BWk", "Arrival — First Contact"),
  youtube("bLvqoHBptjg", "Dune — Sandworm"),
  youtube("HhesaQXLuRY", "Gravity — Untethered"),
  youtube("QFDbLKQrKmk", "Whiplash — Caravan"),
  youtube("wxN1T1uxQ2g", "1917 — The Run"),
  youtube("zSWdZVtXT7E", "Inception — Hallway"),
  youtube("5xH0HfJHsaY", "Sicario — Border"),
];

export const ROUND_COUNT = 5;

/** The two pools an nxn round pits against each other — fixed for the pack. */
const POOL_NAMES: [string, string] = ["Sci-fi", "Thriller"];

/** How many options a round of this format puts up. */
function optionCount(format: LabFormat): number {
  if (format === "1v1") return 2;
  if (format === "nxn") return 2;
  // Elimination and rank_blind both draw a slate. Five with four players is
  // the readable size: Claim leaves exactly one item unclaimed, and a ranking
  // of five is long enough to compare without being a wall.
  return 5;
}

/** The items on the board that round, in draw order. */
export function roundItems(format: LabFormat, index: number): Item[] {
  const size = format === "nxn" ? 4 : optionCount(format);
  // Rotating the window per round gives every round a different slate, which
  // is what makes a five-round history worth reading.
  return Array.from(
    { length: size },
    (_, i) => CLIPS[(index * size + i) % CLIPS.length],
  );
}

/**
 * The two sides of an nxn round.
 *
 * The pool IDS are stable across rounds and the ITEMS are not: an nxn pack
 * pits the same two pools against each other every round and re-draws from
 * them. Minting a fresh id per round would make five rounds look like ten
 * different pools to anything that aggregates.
 */
export function sidesFor(index: number): [RoundSide, RoundSide] {
  const items = roundItems("nxn", index);
  return [0, 1].map((side) => ({
    id: `pool-${side}`,
    name: POOL_NAMES[side],
    itemIds: [items[side * 2].id, items[side * 2 + 1].id],
  })) as [RoundSide, RoundSide];
}

/** The ids a player acts on — items, or (nxn) pools. */
export function optionIdsFor(format: LabFormat, index: number): string[] {
  if (format === "nxn") return sidesFor(index).map((side) => side.id);
  return roundItems(format, index).map((item) => item.id);
}

/**
 * Which option each player took.
 *
 * Not random: Cara is the contrarian, Alice and Devrim move together, Bogdan
 * drifts. Guess-who and Spy both ask you to read exactly this, so a mock whose
 * picks carry no pattern would make those screens look like they work while
 * the thing they exist for is missing.
 *
 * On a slate of five the seed is offset by seat so the four picks spread out
 * instead of piling onto one card — with two options it is the seed itself,
 * which is what keeps the versus rounds at a deliberate 3-1.
 */
export function pickedOptionId(
  format: LabFormat,
  index: number,
  userId: string,
): string {
  const ids = optionIdsFor(format, index);
  const seed = PICK_SEED[userId][index];
  if (ids.length === 2) return ids[seed];
  const seat = LAB_PLAYERS.findIndex((p) => p.userId === userId);
  return ids[(seed + seat) % ids.length];
}

/** Every player's ballot — the whole slate, ordered, for the ranked modes. */
function ballotFor(format: LabFormat, index: number, userId: string): string[] {
  const ids = optionIdsFor(format, index);
  const seat = LAB_PLAYERS.findIndex((p) => p.userId === userId);
  // A rotation per player: everyone ranks the same items in a different order,
  // which is exactly what a Borda aggregate and a Guess-who column are read
  // from. An identical ordering for everyone would prove nothing.
  return ids.map((_, i) => ids[(i + seat + index) % ids.length]);
}

/** The round as it is being PLAYED. */
export function liveRound(
  format: LabFormat,
  mode: RoomMode,
  index: number,
): RoundState {
  const items = roundItems(format, index);
  return {
    index,
    name: `Round ${index + 1}`,
    items,
    claims: {},
    survivorItemId: null,
    optionIds: optionIdsFor(format, index),
    // Present ONLY on nxn. Its absence is what every board tests to decide
    // whether an option is an item or a pool, so a stray empty array would
    // send the other formats down the wrong arm.
    ...(format === "nxn" ? { sides: sidesFor(index) } : {}),
    actionKind: mode === "shared_grid" || mode === "relay" ? "rank" : "pick",
  };
}

/** The round once it has resolved, in the shape its mode records. */
export function closedRound(
  format: LabFormat,
  mode: RoomMode,
  index: number,
): RoundResult {
  const items = roundItems(format, index);
  const ids = optionIdsFor(format, index);
  const sides = format === "nxn" ? { sides: sidesFor(index) } : {};
  const base = { index, name: `Round ${index + 1}`, items };
  const picks = Object.fromEntries(
    LAB_PLAYERS.map((p) => [p.userId, pickedOptionId(format, index, p.userId)]),
  );

  switch (mode) {
    case "claim":
    case "turn_based_cut": {
      // Every player takes a DIFFERENT item — Claim's whole mechanic is that
      // the one nobody grabbed is the one that survives, so colliding claims
      // would leave the round with no survivor at all.
      const claims = Object.fromEntries(
        LAB_PLAYERS.map((p, seat) => [
          p.userId,
          ids[(seat + index) % ids.length],
        ]),
      );
      const taken = new Set(Object.values(claims));
      const survivorItemId = ids.find((id) => !taken.has(id)) ?? ids[0];
      return {
        ...base,
        kind: "survivor",
        claims,
        survivorItemId,
        // Turn-based cut records ORDER as well as who: a player may cut more
        // than once, which the per-item claim map alone cannot express.
        ...(mode === "turn_based_cut"
          ? {
              cuts: Object.entries(claims).map(([userId, itemId]) => ({
                userId,
                itemId,
              })),
            }
          : {}),
      };
    }
    case "voting": {
      const tally: Record<string, number> = Object.fromEntries(
        ids.map((id) => [id, 0]),
      );
      for (const id of Object.values(picks)) tally[id] += 1;
      const winnerOptionId = ids.reduce((best, id) =>
        tally[id] > tally[best] ? id : best,
      );
      return {
        ...base,
        ...sides,
        kind: "vote",
        optionIds: ids,
        votes: picks,
        tally,
        winnerOptionId,
        tieBroken: false,
        priorityUserId: "u2",
      };
    }
    case "guess_who":
      return {
        ...base,
        ...sides,
        kind: "reveal",
        // Keyed by anonymous LABEL — the one thing that distinguishes this
        // result from Spy's, which looks identical on the wire. A rank_blind
        // pick is a whole ordering; every other format's is one choice.
        picks: Object.fromEntries(
          LAB_PLAYERS.map((p) => [
            p.label,
            format === "rank_blind"
              ? ballotFor(format, index, p.userId)
              : [pickedOptionId(format, index, p.userId)],
          ]),
        ),
      };
    case "spy":
      return {
        ...base,
        ...sides,
        kind: "spy_round",
        picks: Object.fromEntries(
          Object.entries(picks).map(([userId, id]) => [userId, [id]]),
        ),
      };
    case "shared_grid": {
      const ballots = Object.fromEntries(
        LAB_PLAYERS.map((p) => [p.userId, ballotFor(format, index, p.userId)]),
      );
      // Borda: a ballot's first place is worth n-1, its last 0.
      const scores: Record<string, number> = Object.fromEntries(
        ids.map((id) => [id, 0]),
      );
      for (const ballot of Object.values(ballots)) {
        ballot.forEach((id, position) => {
          scores[id] += ballot.length - 1 - position;
        });
      }
      return {
        ...base,
        kind: "borda",
        scores,
        // Tiers, not a flat list: equal Borda scores are a genuine tie, and
        // flattening them would invent an order the aggregate never produced.
        order: Object.entries(
          [...ids].reduce<Record<number, string[]>>((tiers, id) => {
            const score = scores[id];
            return { ...tiers, [score]: [...(tiers[score] ?? []), id] };
          }, {}),
        )
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([, tier]) => tier),
        ballots,
      };
    }
    case "relay": {
      const order = ballotFor(format, index, "u1");
      return {
        ...base,
        kind: "relay",
        order,
        // One placement per item, cycling through the room in seat order —
        // Relay's round is built one player at a time.
        placements: order.map((itemId, position) => ({
          userId: LAB_PLAYERS[position % LAB_PLAYERS.length].userId,
          itemId,
        })),
      };
    }
  }
}

/** The modes this format can actually run, straight from the room model. */
export function modesFor(format: LabFormat): RoomMode[] {
  return (Object.keys(ROOM_MODE_BOUNDS) as RoomMode[]).filter((mode) =>
    ROOM_MODE_BOUNDS[mode].formats.includes(format),
  );
}
