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
};

/** The mode picker card's one-line blurb. */
export const MODE_BLURB_KEY: Record<RoomMode, string> = {
  claim: "modes.claim.blurb",
  guess_who: "modes.guess_who.blurb",
  turn_based_cut: "modes.turn_based_cut.blurb",
  voting: "modes.voting.blurb",
  shared_grid: "modes.shared_grid.blurb",
  relay: "modes.relay.blurb",
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
    ] as RoomMode[]
  ).map((mode) => [
    mode,
    ["1", "2", "3"].map((n) => `modes.${mode}.steps.${n}`),
  ]),
) as Record<RoomMode, string[]>;

/**
 * What a mode hands back at the end: one verdict the whole room shares, or per
 * player scores with a winner. Only Guess-who scores — everything else resolves
 * to a single shared outcome per round — and the picker card colours the chip
 * on this, so it is the one thing distinguishing a competitive mode at a glance.
 */
export const MODE_RESULT_KIND: Record<RoomMode, "shared" | "scored"> = {
  claim: "shared",
  guess_who: "scored",
  turn_based_cut: "shared",
  voting: "shared",
  shared_grid: "shared",
  relay: "shared",
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
};

/**
 * Claim now serves both save_one and sacrifice_one packs (it used to be
 * exclusively the save_one_friends format's one gameplay) — the verb the
 * board/results copy uses ("Save" vs "Sacrifice") must follow the PACK's
 * format, exactly like the solo play screens' own CHOSEN_LABEL_KEY
 * (src/features/play/play-format-copy.ts). Every format needs a key for
 * Record<PackFormat, ...>'s exhaustiveness even though only Claim's two
 * formats ever reach this helper.
 */
const CLAIM_VERB_KEY: Record<Pack["format"], string> = {
  save_one: "claimVerbSave",
  sacrifice_one: "claimVerbSacrifice",
  nxn: "",
  rank_blind: "",
  "1v1": "",
};

export function claimVerbKey(format: Pack["format"]): string {
  return CLAIM_VERB_KEY[format];
}
