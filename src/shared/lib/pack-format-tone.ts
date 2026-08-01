import type { LucideIcon } from "lucide-react";
import { Flame, LayoutGrid, ListOrdered, Shield, Swords } from "lucide-react";
import type { PackFormat } from "@/src/shared/types/pack";

export interface PackFormatTone {
  Icon: LucideIcon;
  /** Full literal fill + text pair for the format's icon tile. */
  tile: string;
}

/**
 * A glyph and a hue per pack format, for surfaces that identify a pack by a
 * small tile rather than its cover art (the profile's History rows).
 *
 * Keyed by {@link PackFormat}, so the map is total and a sixth format fails
 * typecheck here rather than silently rendering blank. Every class is a full
 * literal — Tailwind's JIT can't see an interpolated one, and `cn()` is a plain
 * join, so a partial override would emit both.
 */
const TONES: Record<PackFormat, PackFormatTone> = {
  save_one: {
    Icon: Shield,
    tile: "bg-live/[0.14] text-live",
  },
  sacrifice_one: {
    Icon: Flame,
    tile: "bg-danger/[0.14] text-[#ff8c8c]",
  },
  rank_blind: {
    Icon: ListOrdered,
    tile: "bg-score/[0.14] text-score",
  },
  nxn: {
    Icon: LayoutGrid,
    tile: "bg-acc/[0.14] text-acc-hover",
  },
  "1v1": {
    Icon: Swords,
    tile: "bg-hot/[0.14] text-[#ff8bd1]",
  },
};

export function packFormatTone(format: PackFormat): PackFormatTone {
  return TONES[format];
}
