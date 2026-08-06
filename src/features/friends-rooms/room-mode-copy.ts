import type { Pack } from "@/src/shared/types/pack";
import type { RoomMode } from "./room-types";

/** The mode picker card's title — `room.modes.<mode>.name` in the `room` catalog. */
export const MODE_NAME_KEY: Record<RoomMode, string> = {
  claim: "modes.claim.name",
  guess_who: "modes.guess_who.name",
  turn_based_cut: "modes.turn_based_cut.name",
  voting: "modes.voting.name",
  shared_grid: "modes.shared_grid.name",
  relay: "modes.relay.name",
  spy: "modes.spy.name",
};

/** The mode picker card's one-line blurb. */
export const MODE_BLURB_KEY: Record<RoomMode, string> = {
  claim: "modes.claim.blurb",
  guess_who: "modes.guess_who.blurb",
  turn_based_cut: "modes.turn_based_cut.blurb",
  voting: "modes.voting.blurb",
  shared_grid: "modes.shared_grid.blurb",
  relay: "modes.relay.blurb",
  spy: "modes.spy.blurb",
};

/**
 * The three-step "how a round goes" explainer under the picker —
 * `room.modes.<mode>.steps.<n>.title` / `.body`. Three for every mode, so the
 * panel is a fixed shape rather than a variable-length list.
 */
export const MODE_STEP_KEYS: Record<RoomMode, string[]> = Object.fromEntries(
  (
    [
      "claim",
      "guess_who",
      "turn_based_cut",
      "voting",
      "shared_grid",
      "relay",
      "spy",
    ] as RoomMode[]
  ).map((mode) => [
    mode,
    ["1", "2", "3"].map((n) => `modes.${mode}.steps.${n}`),
  ]),
) as Record<RoomMode, string[]>;

/**
 * What a mode hands back at the end: one verdict the whole room shares, or per
 * player scores with a winner. Guess-who and Spy score; everything else
 * resolves to a single shared outcome per round. The picker card colours its
 * chip on this, so it is the one thing distinguishing a competitive mode at a
 * glance.
 */
export const MODE_RESULT_KIND: Record<RoomMode, "shared" | "scored"> = {
  claim: "shared",
  guess_who: "scored",
  turn_based_cut: "shared",
  voting: "shared",
  shared_grid: "shared",
  relay: "shared",
  // Both roles compete on one leaderboard: an accuser scores for naming the
  // spy, the spy for every accuser who looked elsewhere.
  spy: "scored",
};

/** lucide-react icon name per mode, for the mode picker card. Resolved by the
 * caller (ModePicker.tsx) — kept as a string here, not a component reference,
 * so this stays a plain data module with no React/JSX dependency. */
export const MODE_ICON: Record<RoomMode, string> = {
  claim: "Swords",
  guess_who: "Users",
  turn_based_cut: "Scissors",
  voting: "Vote",
  shared_grid: "LayoutGrid",
  relay: "Repeat",
  spy: "EyeOff",
};

/**
 * Claim's two verbs, per pack format.
 *
 * The engine is format-blind: it draws `players + 1` items, claims are
 * exclusive, and the single UNCLAIMED item is the one the round singles out
 * (claim.engine.ts). What that item MEANS is the format's to say — and the
 * claim then means the opposite:
 *
 *   save_one       one item ends up saved      → the odd one out is SAVED,
 *                                                 so claiming sacrifices
 *   sacrifice_one  one item ends up sacrificed → the odd one out is SACRIFICED,
 *                                                 so claiming saves
 *
 * This is the bug this pair exists to prevent. The board previously called
 * every claim a sacrifice regardless of format, which told a sacrifice_one
 * room to sacrifice one item EACH — a round with as many sacrifices as there
 * are players, in a format whose whole premise is one. Everyone protects one
 * item; the one nobody protected is the sacrifice.
 *
 * Both helpers return a key SUFFIX ("Save" | "Sacrifice"), because the copy
 * they select is a family of `…Save`/`…Sacrifice` message keys.
 */
export type ClaimVerb = "Save" | "Sacrifice";

/** What happens to the item nobody claimed — the format's own verb. */
export function outcomeVerb(format: Pack["format"]): ClaimVerb {
  return format === "sacrifice_one" ? "Sacrifice" : "Save";
}

/** What a claim does — always the opposite of {@link outcomeVerb}. */
export function claimVerb(format: Pack["format"]): ClaimVerb {
  return format === "sacrifice_one" ? "Save" : "Sacrifice";
}
