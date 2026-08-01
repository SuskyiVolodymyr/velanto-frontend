import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  FileText,
  Heart,
  Lock,
  ListOrdered,
  ShieldAlert,
  ShieldCheck,
  Swords,
  UserRoundX,
  Users,
} from "lucide-react";

/**
 * Per-category glyph + accent for the rules page, keyed by the backend's stable
 * category id (`GET /rules`). The mock gives each category a coloured 32px tile,
 * grouping the twelve into four families by hue: red for the ones about harm to
 * people, pink for the ones about a person's body or dignity, amber for
 * deception, cyan for information, green for the ones about the platform and
 * other people's work.
 *
 * A category the backend adds but this map doesn't know still renders — it just
 * falls back to the neutral tile, which is why {@link ruleCategoryTone} never
 * throws on an unknown id.
 */
interface RuleCategoryTone {
  Icon: LucideIcon;
  /** Full literal class pair — Tailwind's JIT can't see an interpolated one. */
  tile: string;
}

const TONES: Record<string, RuleCategoryTone> = {
  hate_discrimination: {
    Icon: ShieldAlert,
    tile: "bg-[rgba(255,90,90,0.14)] text-[#FF5A5A]",
  },
  harassment_bullying: {
    Icon: Users,
    tile: "bg-[rgba(255,92,192,0.14)] text-[#FF5CC0]",
  },
  violence_harm: {
    Icon: Swords,
    tile: "bg-[rgba(255,90,90,0.14)] text-[#FF5A5A]",
  },
  sexual_content: {
    Icon: Heart,
    tile: "bg-[rgba(255,92,192,0.14)] text-[#FF5CC0]",
  },
  child_safety: {
    Icon: AlertTriangle,
    tile: "bg-[rgba(255,90,90,0.14)] text-[#FF5A5A]",
  },
  illegal_content: {
    Icon: Ban,
    tile: "bg-[rgba(255,194,75,0.14)] text-[#FFC24B]",
  },
  privacy_doxxing: {
    Icon: Lock,
    tile: "bg-[rgba(0,229,255,0.14)] text-[#00E5FF]",
  },
  impersonation_deception: {
    Icon: UserRoundX,
    tile: "bg-[rgba(255,194,75,0.14)] text-[#FFC24B]",
  },
  spam_manipulation: {
    Icon: ListOrdered,
    tile: "bg-[rgba(255,194,75,0.14)] text-[#FFC24B]",
  },
  misinformation: {
    Icon: AlertTriangle,
    tile: "bg-[rgba(0,229,255,0.14)] text-[#00E5FF]",
  },
  intellectual_property: {
    Icon: FileText,
    tile: "bg-[rgba(57,217,138,0.14)] text-[#39D98A]",
  },
  platform_integrity: {
    Icon: BadgeCheck,
    tile: "bg-[rgba(57,217,138,0.14)] text-[#39D98A]",
  },
};

const FALLBACK: RuleCategoryTone = {
  Icon: ShieldCheck,
  tile: "bg-white/[0.06] text-foreground-secondary",
};

export function ruleCategoryTone(id: string): RuleCategoryTone {
  return TONES[id] ?? FALLBACK;
}
