import type { Pack } from "@/src/shared/types/pack";

/**
 * Maps each format to its key in the `play` message namespace. Only
 * save_one/sacrifice_one/nxn actually reach PlayScreen; rank_blind and 1v1 are
 * routed to sibling screens (see PlayRouter) and map to "" purely to satisfy
 * Record<PackFormat, ...>'s exhaustiveness.
 *
 * UI-EXCLUDED:save_one_friends (velanto-frontend#368) — maps to "" for the same
 * exhaustiveness reason. It is NOT safe to read: "" resolves to the literal
 * "play." at render time. PlayRouter 404s that format precisely so this map is
 * never consulted for it; do not relax that without giving it real copy.
 */
export const INSTRUCTION_KEY: Record<Pack["format"], string> = {
  save_one: "instructionSave",
  sacrifice_one: "instructionSacrifice",
  nxn: "instructionNxn",
  rank_blind: "",
  "1v1": "",
  save_one_friends: "",
};

export const PICKED_LABEL_KEY: Record<Pack["format"], string> = {
  save_one: "savedSoFar",
  sacrifice_one: "sacrificedSoFar",
  nxn: "savedSoFar",
  rank_blind: "",
  "1v1": "",
  save_one_friends: "",
};
