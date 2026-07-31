"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { RoomState } from "./room-types";

/** One label's colour family. Four is the roster cap the endgame ever shows at
 * once in practice; beyond that they cycle, which is fine — the letters, not
 * the colours, are what identify a column. */
const LABEL_TONES = [
  { chip: "bg-acc/[0.14] text-acc-hover", cell: "bg-acc/[0.07]" },
  { chip: "bg-hot/[0.14] text-hot", cell: "bg-hot/[0.07]" },
  { chip: "bg-live/[0.14] text-live", cell: "bg-live/[0.07]" },
  { chip: "bg-score/[0.14] text-score", cell: "bg-score/[0.07]" },
];

/**
 * "What each label picked" (Guess Who Results.dc.html): one column per
 * anonymous label, one row per round, every pick in the open.
 *
 * This is the whole evidence base of the mode — a single round gives nobody
 * away, because two people often pick the same thing; it is the shape of a
 * whole column that is recognisable. So the table is what the guessing screen
 * is read FROM, not a summary shown afterwards.
 */
export function GuessWhoLabelTable({
  state,
  /** Once revealed, name each column's real player under its letter. */
  revealed = false,
}: {
  state: RoomState;
  revealed?: boolean;
}) {
  const t = useTranslations("room");
  const reveals = state.results.filter((r) => r.kind === "reveal");
  const labels = [
    ...new Set(reveals.flatMap((r) => Object.keys(r.picks))),
  ].sort();
  if (labels.length === 0) return null;

  const usernameById = new Map(
    state.players.map((p) => [p.userId, p.username]),
  );
  const mapping = state.endgame?.mapping ?? {};

  return (
    <section
      aria-label={t("guessWho.trajectoryHeading")}
      className="flex flex-col gap-[13px] rounded-[20px] border border-border bg-surface-card p-5"
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
          {t("guessWho.trajectoryHeading")}
        </Text>
        <Text variant="tertiary" className="text-[12.5px]">
          {t("guessWho.trajectoryHint", { count: reveals.length })}
        </Text>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[320px] gap-1.5"
          style={{
            gridTemplateColumns: `auto repeat(${labels.length}, minmax(0, 1fr))`,
          }}
        >
          <span className="px-1 py-1.5 text-[11px] font-bold tracking-[0.1em] text-foreground-tertiary uppercase">
            {t("guessWho.roundColumn")}
          </span>
          {labels.map((label, i) => {
            const tone = LABEL_TONES[i % LABEL_TONES.length];
            const who = revealed ? usernameById.get(mapping[label]) : null;
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-[5px] rounded-[11px] border border-border bg-background px-1 py-2"
              >
                <span
                  className={cn(
                    "grid h-8 w-8 flex-none place-items-center rounded-[10px] text-sm font-extrabold",
                    tone.chip,
                  )}
                >
                  {label}
                </span>
                <span className="truncate text-[11px] font-semibold text-foreground-secondary">
                  {who ?? t("guessWho.stillAnonymous")}
                </span>
              </div>
            );
          })}

          {reveals.map((round) => (
            <FragmentRow
              key={round.index}
              index={round.index}
              labels={labels}
              round={round}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-control border border-border bg-white/[0.04] p-[11px_13px]">
        <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-chip bg-acc/[0.14] text-acc-hover">
          <Info size={14} aria-hidden />
        </span>
        <Text variant="tertiary" className="text-xs leading-[1.45] text-pretty">
          {t("guessWho.columnHint")}
        </Text>
      </div>
    </section>
  );
}

/** One round's row: its number, then that round's pick under every label. */
function FragmentRow({
  index,
  labels,
  round,
}: {
  index: number;
  labels: string[];
  round: Extract<RoomState["results"][number], { kind: "reveal" }>;
}) {
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  return (
    <>
      <span className="grid place-items-center px-1.5 font-mono text-[11.5px] font-semibold text-foreground-tertiary">
        {index + 1}
      </span>
      {labels.map((label, i) => {
        const picks = round.picks[label] ?? [];
        const tone = LABEL_TONES[i % LABEL_TONES.length];
        return (
          <span
            key={label}
            className={cn(
              "flex items-center justify-center truncate rounded-[9px] px-2 py-[9px] text-[12.5px] font-semibold text-foreground-secondary",
              tone.cell,
            )}
          >
            {/* A rank_blind round's "pick" is a whole ordering; its FIRST
                entry is the one that reads as a choice, and the rest would
                make the cell unreadable. */}
            {picks
              .slice(0, 1)
              .map((id) => itemsById.get(id)?.title ?? id)
              .join("") || "—"}
          </span>
        );
      })}
    </>
  );
}
