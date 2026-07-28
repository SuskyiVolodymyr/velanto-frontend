import { Text } from "@/src/shared/components/Text";
import type { Pick } from "@/src/features/play/use-play-session";

interface PicksSummaryProps {
  label: string;
  picks: Pick[];
}

/**
 * The "SAVED SO FAR" chip row shown while a solo play session is in
 * progress. Caller supplies the label string (no i18n owned here — see
 * PlayScreen's `PICKED_LABEL_KEY` lookup). Each chip renders `pick.itemTitle`
 * alone: for versus formats the item title already IS the side name, so no
 * extra per-format marker is added.
 */
export function PicksSummary({ label, picks }: PicksSummaryProps) {
  return (
    <section>
      <Text
        variant="tertiary"
        className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em]"
      >
        {label}
      </Text>
      <div className="flex flex-wrap gap-2">
        {picks.map((pick, index) => (
          <Text
            key={`${pick.groupId}-${index}`}
            as="span"
            variant="secondary"
            className="play-card-appear inline-flex items-center gap-2 rounded-control border border-border bg-white/[0.03] p-[7px_12px] text-[12.5px]"
          >
            {pick.itemTitle}
          </Text>
        ))}
      </div>
    </section>
  );
}
