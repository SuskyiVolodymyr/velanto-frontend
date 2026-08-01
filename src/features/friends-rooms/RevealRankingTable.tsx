"use client";

import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";

/**
 * One anonymous label's whole ordering from a closed rank_blind round.
 *
 * A rank_blind "pick" is not a choice, it is a RANKING — so the reveal cannot
 * be a marked card. It used to mark only the ordering's first entry on the
 * board, which threw away everything the round revealed; in Guess-who those
 * orderings are the entire evidence base, and the between-round beat is where
 * you read them side by side.
 */
export function RevealRankingTable({
  label,
  className,
  items,
  /** True for the viewer's own label — they already know which one is theirs. */
  mine = false,
}: {
  label: string;
  /** The label's own chip tone, so a column is followed by colour all game. */
  className: string;
  /** The ranked items, best first. */
  items: Item[];
  mine?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-[16px] border bg-surface-card p-3.5",
        mine ? "border-acc/40" : "border-border",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 flex-none place-items-center rounded-[10px] text-sm font-extrabold",
          className,
        )}
      >
        {label}
      </span>

      <ol className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-2.5 rounded-[10px] border border-border bg-background p-[7px_9px]"
          >
            <span
              aria-hidden
              className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] bg-white/[0.06] font-mono text-[11px] font-bold tabular-nums text-foreground-tertiary"
            >
              {index + 1}
            </span>
            {/* A plain block, not a flex child: text inside a flex container is
                a flex item that will not shrink, so a long title would spill
                over the column instead of ellipsising (the same trap the label
                table hit). Full name on hover, since truncation eats the end. */}
            <Text
              title={item.title}
              className="min-w-0 flex-1 truncate text-[12.5px] font-semibold"
            >
              {item.title}
            </Text>
          </li>
        ))}
      </ol>
    </div>
  );
}
