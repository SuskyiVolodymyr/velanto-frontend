import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { Pick } from "@/src/features/play/use-play-session";

interface PicksSummaryProps {
  label: string;
  picks: Pick[];
  /** Total rounds in the run — drives the "N done, N to go" count note beside
   * the heading. Omit (or 0) to hide the note, e.g. from a caller that hasn't
   * threaded a round count through. */
  totalRounds?: number;
}

/**
 * The "SAVED SO FAR" chip row shown while a solo play session is in
 * progress. Caller supplies the label string (no i18n owned here — see
 * PlayScreen's `PICKED_LABEL_KEY` lookup). Each chip now leads with a small
 * numbered badge (the pick's 1-based position in the run) before
 * `pick.itemTitle` — for versus formats the item title already IS the side
 * name, so no extra per-format marker is added.
 */
export function PicksSummary({ label, picks, totalRounds }: PicksSummaryProps) {
  const t = useTranslations("play");
  const showCountNote = Boolean(totalRounds && totalRounds > 0);
  const toGo = Math.max((totalRounds ?? 0) - picks.length, 0);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Text
          variant="tertiary"
          className="text-[12px] font-medium uppercase tracking-[0.12em]"
        >
          {label}
        </Text>
        {showCountNote && (
          <Text variant="tertiary" className="text-[11.5px] tabular-nums">
            {t("picksCountNote", { done: picks.length, toGo })}
          </Text>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {picks.map((pick, index) => (
          <Text
            key={`${pick.groupId}-${index}`}
            as="span"
            variant="secondary"
            className="play-card-appear inline-flex items-center gap-2 rounded-control border border-border bg-white/[0.03] p-[7px_12px] text-[12.5px]"
          >
            <span
              aria-hidden
              className="flex h-4 w-4 flex-none items-center justify-center rounded-pill bg-acc/[0.16] text-[10px] font-bold text-acc"
            >
              {index + 1}
            </span>
            {pick.itemTitle}
          </Text>
        ))}
      </div>
    </section>
  );
}
