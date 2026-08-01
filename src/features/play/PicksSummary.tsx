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
  /**
   * Group chips into one bordered container per round instead of one flat
   * row. nxn's `resolvePicks` records every item of the WINNING side, so a
   * 3-item side leaves three `Pick`s per round — flattened, there was no way
   * to tell which items belonged to the same round. Elimination formats
   * (save_one/sacrifice_one) always leave exactly one chosen item per round,
   * so a box around a single chip would be a redundant wrapper — this stays
   * off for them.
   */
  groupByRound?: boolean;
}

/** One item chip — the pill shared by both the flat and grouped layouts. */
function PickChip({
  pick,
  number,
}: {
  pick: Pick;
  /** 1-based position shown in the small circular badge. Omit to render the
   * chip without one (used inside a round container, where the container's
   * own round-number badge already carries the ordering). */
  number?: number;
}) {
  return (
    <Text
      as="span"
      variant="secondary"
      className="play-card-appear inline-flex items-center gap-2 rounded-control border border-border bg-white/[0.03] p-[7px_12px] text-[12.5px]"
    >
      {number !== undefined && (
        <span
          aria-hidden
          className="flex h-4 w-4 flex-none items-center justify-center rounded-pill bg-acc/[0.16] text-[10px] font-bold text-acc"
        >
          {number}
        </span>
      )}
      {pick.itemTitle}
    </Text>
  );
}

/**
 * The "SAVED SO FAR" chip row shown while a solo play session is in
 * progress. Caller supplies the label string (no i18n owned here — see
 * PlayScreen's `PICKED_LABEL_KEY` lookup).
 */
export function PicksSummary({
  label,
  picks,
  totalRounds,
  groupByRound,
}: PicksSummaryProps) {
  const t = useTranslations("play");

  // Grouped by roundIndex, in round order — a Map preserves insertion order,
  // and picks always arrive in round order already, so no extra sort is
  // needed.
  const roundGroups = groupByRound
    ? Array.from(
        picks.reduce((acc, pick) => {
          const list = acc.get(pick.roundIndex) ?? [];
          list.push(pick);
          acc.set(pick.roundIndex, list);
          return acc;
        }, new Map<number, Pick[]>()),
      )
    : null;

  // Grouped: "done" counts ROUNDS finished, not individual items — a 3-item
  // winning side must not read as "3 done" after a single round.
  const doneCount = roundGroups ? roundGroups.length : picks.length;
  const showCountNote = Boolean(totalRounds && totalRounds > 0);
  const toGo = Math.max((totalRounds ?? 0) - doneCount, 0);

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
            {t("picksCountNote", { done: doneCount, toGo })}
          </Text>
        )}
      </div>
      {roundGroups ? (
        <div className="flex flex-col gap-2">
          {roundGroups.map(([roundIndex, roundPicks]) => (
            <div
              key={roundIndex}
              data-testid="picks-round-group"
              className="flex flex-wrap items-center gap-2 rounded-tile border border-border bg-white/[0.02] p-3"
            >
              <span
                aria-hidden
                className="flex h-6 w-6 flex-none items-center justify-center rounded-pill bg-white/[0.06] text-[11px] font-bold text-foreground-tertiary"
              >
                {roundIndex + 1}
              </span>
              <div className="flex flex-wrap gap-2">
                {roundPicks.map((pick) => (
                  <PickChip
                    key={`${pick.groupId}-${pick.itemId}`}
                    pick={pick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {picks.map((pick, index) => (
            <PickChip
              key={`${pick.groupId}-${index}`}
              pick={pick}
              number={index + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}
