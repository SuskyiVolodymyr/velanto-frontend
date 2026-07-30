"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BoardCard, BoardRow } from "@/src/features/result/BoardCard";
import { withCompetitionRanks } from "@/src/features/result/result-table";
import type {
  PodiumTally,
  RecordedPick,
} from "@/src/shared/types/play-results";

/** How many rows a press of "Show N more" adds — mock starts at 5, was 10 (T11). */
const PAGE = 5;

/**
 * rank_blind's pack-wide ranking: how often each item was placed first, second
 * or third, ordered by the three combined.
 *
 * The sum ranks rather than the firsts alone because a rank_blind round is a
 * whole ordering, not a single pick — an item reliably near the top says more
 * about a pack than one that occasionally wins and is mid-table otherwise. The
 * three counts stay visible as the row's detail figure ("12/8/5", best-to-
 * worst placement), so a reader can still see which kind of item they're
 * looking at instead of taking the sum on trust; `podiumSubtitle` at the
 * card's foot is what names those three numbers.
 *
 * Shares `BoardCard`/`BoardRow` with `TopPickedTable`. This used to be a
 * six-column `<table>` (rank / item / 1st / 2nd / 3rd / total) with
 * medal-coloured row outlines, which in the mock's 330px aside had to scroll
 * sideways and wrapped every item title over five lines. `Results.dc.html` has
 * no rank_blind variant, so this slot takes the board shape the mock does
 * define for it.
 */
export function PodiumTable({
  items,
  title,
  note,
  subtitle,
  ownPicks,
}: {
  items: PodiumTally[];
  /** Visible bold card title (mock's `boardTitle` shape) — omit for no
   * visible header (existing callers that only need the list itself). */
  title?: string;
  /** Right-aligned text beside the title (mock's `boardNote`). Only shown
   * when `title` is also passed. */
  note?: string;
  /** Footnote line at the card's foot. Only rendered when `title` is passed. */
  subtitle?: string;
  ownPicks?: RecordedPick[] | null;
}) {
  const t = useTranslations("result");
  const [shown, setShown] = useState(PAGE);
  // A tie needs all three counts to match, not just the total: 3/0/0 and 1/1/1
  // both total 3 and are not the same result.
  const ranked = useMemo(
    () =>
      withCompetitionRanks(
        items,
        (item) => `${item.first}|${item.second}|${item.third}`,
      ),
    [items],
  );
  const visible = ranked.slice(0, shown);
  // Ranked is pre-sorted best-first, so the top row's total is the scale's max
  // — stable as more rows load, unlike scaling against only the visible slice.
  // Podium totals have no natural percentage, so unlike TopPickedTable's
  // identical-looking bar this one is relative, not absolute 0–100. Don't
  // "fix" the two to match.
  const maxTotal = ranked[0]?.total ?? 0;
  const mine = useMemo(
    () =>
      new Set(
        (ownPicks ?? [])
          .map((pick) => pick.itemId)
          .filter((id): id is string => id !== undefined),
      ),
    [ownPicks],
  );

  return (
    <BoardCard
      title={title}
      note={note}
      subtitle={subtitle}
      listLabel={title ?? t("podiumHeading")}
      remaining={Math.min(PAGE, ranked.length - visible.length)}
      onShowMore={() => setShown((n) => n + PAGE)}
    >
      {visible.map((item) => (
        <li key={item.itemId} data-rank={item.rank}>
          <BoardRow
            name={item.itemTitle}
            rank={item.rank}
            mine={mine.has(item.itemId)}
            headline={String(item.total)}
            detail={`${item.first}/${item.second}/${item.third}`}
            fill={maxTotal > 0 ? (item.total / maxTotal) * 100 : 0}
          />
        </li>
      ))}
    </BoardCard>
  );
}
