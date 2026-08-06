"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BoardCard, BoardRow } from "@/src/shared/components/BoardCard";
import { withCompetitionRanks } from "@/src/features/result/result-table";
import type { ItemTally, RecordedPick } from "@/src/shared/types/play-results";

/** How many rows a press of "Show N more" adds — mock starts at 5, was 10 (T11). */
const PAGE = 5;

interface RankedTally extends ItemTally {
  rank: number;
}

/**
 * The rows in competition order. Two items tie only when BOTH their share and
 * their pick count match — the same percentage off a different number of
 * rounds is not the same result.
 */
function rankTallies(items: ItemTally[]): RankedTally[] {
  return withCompetitionRanks(
    items,
    (item) => `${item.percentage}|${item.picked}`,
  );
}

/**
 * The pack-wide "top picked" ranking: how often each item was picked of the
 * rounds it turned up in. Rendered in `ResultScreen`'s aside for every format
 * except rank_blind (which uses `PodiumTable` — same card, same row shape).
 *
 * Matches the mock's flat list exactly — rank, name, a progress bar, done.
 * NOT a `<table>`: T11 originally built this as a bordered table with
 * medal-colored cell outlines per rank, which was never actually what the
 * mock showed (that treatment doesn't appear anywhere in `Results.dc.html`)
 * — rebuilt to match.
 */
export function TopPickedTable({
  items,
  label,
  title,
  note,
  subtitle,
  ownPicks,
}: {
  items: ItemTally[];
  /** Accessible name for the list, when `title` isn't visible copy enough. */
  label?: string;
  /** Visible bold card title (mock's `boardTitle`, e.g. "Most saved") — the
   * caller's own copy since it varies by format/verb. Omit to render no
   * visible header (existing callers that only need the list itself). */
  title?: string;
  /** Right-aligned text beside the title (mock's `boardNote`, e.g. "across
   * 2,142 plays"). Only shown when `title` is also passed. */
  note?: string;
  /** Footnote line at the card's foot (mock's explanatory copy under the
   * board). Only rendered when `title` is also passed. */
  subtitle?: string;
  ownPicks?: RecordedPick[] | null;
}) {
  const t = useTranslations("result");
  const listLabel = label ?? title ?? t("topPickedHeading");
  const [shown, setShown] = useState(PAGE);
  const ranked = useMemo(() => rankTallies(items), [items]);
  const visible = ranked.slice(0, shown);
  const remaining = Math.min(PAGE, ranked.length - visible.length);
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
      listLabel={listLabel}
      remaining={remaining}
      showMoreLabel={t("boardShowMore", { count: remaining })}
      onShowMore={() => setShown((n) => n + PAGE)}
    >
      {visible.map((item) => (
        <li key={item.itemId} data-rank={item.rank}>
          <BoardRow
            name={item.itemTitle}
            rank={item.rank}
            mineLabel={t("topPickedYours")}
            mine={mine.has(item.itemId)}
            // Mock rounds the share to a whole percent — a raw 58.06 reads as
            // false precision next to a two-figure bar.
            headline={`${Math.round(item.percentage)}%`}
            // Mock renders the raw counts as bare numerals ("1189/1748"), not
            // the pack page's "{picked} of {appeared}" sentence.
            detail={`${item.picked}/${item.appeared}`}
            fill={item.percentage}
          />
        </li>
      ))}
    </BoardCard>
  );
}
