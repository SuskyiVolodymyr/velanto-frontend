import type { Pack } from "@/src/shared/types/pack";

/**
 * Maps each format to its key in the `play` message namespace. Only
 * save_one/sacrifice_one/nxn actually reach PlayScreen; rank_blind and 1v1 are
 * routed to sibling screens (see PlayRouter) and map to "" purely to satisfy
 * Record<PackFormat, ...>'s exhaustiveness. save_one_friends maps to "" for the
 * same reason and more strongly — it has no play path in this repo at all yet
 * (velanto-backend#258 is mirrored as a wire-contract constant only), so it
 * cannot reach any play screen until the dedicated frontend PR adds one.
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
