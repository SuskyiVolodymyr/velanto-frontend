import type { Pack } from "@/src/shared/types/pack";

/**
 * Maps each format to its key in the `play` message namespace.
 * save_one/sacrifice_one/nxn reach PlayScreen; 1v1 is routed to
 * HeadToHeadPlayScreen (see PlayRouter) but reads the same two lookups, so its
 * copy stays beside its siblings' rather than inline in that screen. rank_blind
 * builds its own copy from the pool name and maps to "" purely to satisfy
 * Record<PackFormat, ...>'s exhaustiveness.
 */
export const INSTRUCTION_KEY: Record<Pack["format"], string> = {
  save_one: "instructionSave",
  sacrifice_one: "instructionSacrifice",
  nxn: "instructionNxn",
  rank_blind: "",
  "1v1": "instruction1v1",
};

export const PICKED_LABEL_KEY: Record<Pack["format"], string> = {
  save_one: "savedSoFar",
  sacrifice_one: "sacrificedSoFar",
  nxn: "savedSoFar",
  rank_blind: "",
  // 1v1 keeps every round's winner, so the mock heads this row "Your run so
  // far" rather than the elimination formats' "Saved so far".
  "1v1": "yourRunSoFar",
};

/**
 * The "chosen" badge overlaid on a CandidateCard's cover once selected —
 * save_one/nxn both save, sacrifice_one is the odd one out. Only save_one/
 * sacrifice_one actually reach CandidateCard (nxn renders via VersusRound
 * instead), but every format needs a key for Record<PackFormat, ...>'s
 * exhaustiveness.
 */
export const CHOSEN_LABEL_KEY: Record<Pack["format"], string> = {
  save_one: "chosenSave",
  sacrifice_one: "chosenSacrifice",
  nxn: "chosenSave",
  rank_blind: "",
  "1v1": "",
};
