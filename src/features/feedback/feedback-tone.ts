import type { LucideIcon } from "lucide-react";
import { Bug, Languages, MoreHorizontal, Sparkles } from "lucide-react";
import type {
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";

/**
 * Per-topic and per-status colour for the Suggestions surface, keyed by the wire
 * values in {@link FEEDBACK_TOPICS} / {@link FEEDBACK_STATUSES}. Both unions are
 * closed contracts mirrored from the backend, so these maps are total and need
 * no fallback — a new value fails typecheck here, which is the point.
 *
 * Every entry is a full literal class string: Tailwind's JIT can't see a class
 * built by interpolation, and `cn()` is a plain join (not tailwind-merge), so a
 * partial override would emit both classes and let emit order pick the winner.
 */

export interface FeedbackTopicTone {
  Icon: LucideIcon;
  /** Text colour for the topic label in the "Most wanted" rail. */
  label: string;
  /**
   * Border + fill + text for the selected topic in the composer. The *filter*
   * row deliberately doesn't use this — filters all read accent-cyan there, so
   * "this chip is on" stays one colour. In the composer the chip is the answer,
   * not a filter, so it takes the topic's own hue.
   */
  composerChip: string;
}

const TOPIC_TONES: Record<FeedbackTopic, FeedbackTopicTone> = {
  bug: {
    Icon: Bug,
    label: "text-[#FF8C8C]",
    composerChip: "border-[#FF8C8C] bg-[rgba(255,90,90,0.14)] text-[#FF8C8C]",
  },
  feature: {
    Icon: Sparkles,
    label: "text-acc-hover",
    composerChip: "border-acc-hover bg-acc/[0.14] text-acc-hover",
  },
  translation: {
    Icon: Languages,
    label: "text-[#FF8BD1]",
    composerChip: "border-[#FF8BD1] bg-[rgba(255,92,192,0.14)] text-[#FF8BD1]",
  },
  other: {
    Icon: MoreHorizontal,
    label: "text-foreground-secondary",
    composerChip: "border-white/40 bg-white/[0.07] text-foreground-secondary",
  },
};

export function feedbackTopicTone(topic: FeedbackTopic): FeedbackTopicTone {
  return TOPIC_TONES[topic];
}

export interface FeedbackStatusTone {
  /** The 6px legend/chip dot — background only. */
  dot: string;
  /** Border + fill + text for the chip while this status is the active filter. */
  activeChip: string;
}

// The mock gives each status its own active hue rather than a shared accent, so
// a selected "Declined" reads red and a selected "Done" reads green. Matches
// StatusBadge's FEEDBACK_TONE families so the chip and the badge agree.
const STATUS_TONES: Record<FeedbackStatus, FeedbackStatusTone> = {
  new: {
    dot: "bg-acc",
    activeChip: "border-acc/30 bg-acc/10 text-acc",
  },
  in_progress: {
    dot: "bg-status-pending",
    activeChip:
      "border-status-pending/30 bg-status-pending/10 text-status-pending",
  },
  done: {
    dot: "bg-status-approved",
    activeChip:
      "border-status-approved/30 bg-status-approved/10 text-status-approved",
  },
  declined: {
    dot: "bg-status-rejected",
    activeChip:
      "border-status-rejected/30 bg-status-rejected/10 text-status-rejected",
  },
};

export function feedbackStatusTone(status: FeedbackStatus): FeedbackStatusTone {
  return STATUS_TONES[status];
}
