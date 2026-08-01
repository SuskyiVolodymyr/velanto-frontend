import type { Pack } from "@/src/shared/types/pack";

/**
 * The result hero's format-aware h1 (T10): "Here's what you saved" for
 * save_one, etc. — mirrors Solo Play's per-format title-branching pattern.
 * Keyed by the full `PackFormat` since `results.format` (the value this is
 * actually looked up by) shares that type, even though every format IS
 * playable solo today.
 */
export const HERO_TITLE_KEY: Record<
  Pack["format"],
  { own: string; shared: string }
> = {
  save_one: { own: "heroTitleSave", shared: "heroTitleSaveShared" },
  sacrifice_one: {
    own: "heroTitleSacrifice",
    shared: "heroTitleSacrificeShared",
  },
  nxn: { own: "heroTitleNxn", shared: "heroTitleNxnShared" },
  "1v1": { own: "heroTitle1v1", shared: "heroTitle1v1Shared" },
  rank_blind: { own: "heroTitleRank", shared: "heroTitleRankShared" },
};
