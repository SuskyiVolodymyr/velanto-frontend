import type { Pack } from "@/src/shared/types/pack";

/**
 * Maps each format to its key in the `play` message namespace. Only
 * save_one/sacrifice_one/nxn actually reach PlayScreen; rank_blind and 1v1 are
 * routed to sibling screens (see PlayRouter) and map to "" purely to satisfy
 * Record<PackFormat, ...>'s exhaustiveness.
 */
export const INSTRUCTION_KEY: Record<Pack["format"], string> = {
  save_one: "instructionSave",
  sacrifice_one: "instructionSacrifice",
  nxn: "instructionNxn",
  rank_blind: "",
  "1v1": "",
};

export const PICKED_LABEL_KEY: Record<Pack["format"], string> = {
  save_one: "savedSoFar",
  sacrifice_one: "sacrificedSoFar",
  nxn: "savedSoFar",
  rank_blind: "",
  "1v1": "",
};
