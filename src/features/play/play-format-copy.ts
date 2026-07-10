import type { Pack } from "@/src/shared/types/pack";

/**
 * Per-format play copy. Only save_one/sacrifice_one/nxn actually reach
 * PlayScreen; rank_blind and 1v1 are routed to sibling screens (see
 * PlayRouter) and exist here purely to satisfy Record<PackFormat, ...>'s
 * exhaustiveness.
 */
export const FORMAT_COPY: Record<
  Pack["format"],
  { instruction: string; pickedLabel: string; finishedVerb?: string }
> = {
  save_one: {
    instruction: "Pick the one you'd save. Check it below, then confirm.",
    pickedLabel: "Saved so far",
    finishedVerb: "saved",
  },
  sacrifice_one: {
    instruction: "Pick the one you'd sacrifice. Check it below, then confirm.",
    pickedLabel: "Sacrificed so far",
    finishedVerb: "sacrificed",
  },
  nxn: {
    instruction: "Pick the side you'd save. Check it below, then confirm.",
    pickedLabel: "Saved so far",
  },
  // Unreachable: rank_blind packs are routed to RankPlayScreen instead (see
  // app/packs/[id]/play/page.tsx) — this entry exists only to satisfy
  // Record<PackFormat, ...>'s exhaustiveness.
  rank_blind: {
    instruction: "",
    pickedLabel: "",
  },
  // Unreachable: 1v1 packs are routed to HeadToHeadPlayScreen instead (see
  // app/packs/[id]/play/page.tsx) — same treatment as rank_blind above.
  "1v1": {
    instruction: "",
    pickedLabel: "",
  },
};
