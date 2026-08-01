"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ProgressBar } from "@/src/shared/components/ProgressBar";
import { cn } from "@/src/shared/lib/cn";
import { toneFor } from "@/src/features/play/candidate-tone";
import { withCompetitionRanks } from "@/src/features/result/result-table";
import type { ItemTally, RecordedPick } from "@/src/shared/types/play-results";

/** How many rows a press of "Load more" adds — matches TopPickedTable's own. */
const PAGE = 5;

interface RankedTally extends ItemTally {
  rank: number;
}

/** Two items tie only when BOTH their share and pick count match. */
function rankTallies(items: ItemTally[]): RankedTally[] {
  return withCompetitionRanks(
    items,
    (item) => `${item.percentage}|${item.picked}`,
  );
}

/**
 * The pack detail page's own "Most saved/sacrificed/picked" list — a flat row
 * per item (rank, gradient swatch, title, share bar, count, percentage), no
 * table chrome and no podium medal styling. Pack Detail.dc.html's own mock
 * treats this differently from the Results screens' ranking table (which
 * keeps its gold/silver/bronze medal cells — see result-table.tsx — matching
 * Results.dc.html instead): a "most saved" list read mid-browse, before you've
 * played, isn't a podium to win, so it stays a plain list. TopPickedTable is
 * untouched and still used by every Result screen.
 *
 * `toneFor` gives each row a deterministic gradient swatch derived from the
 * pack's own cover tone — the same helper CandidateCard/VersusRound/
 * RankPlayScreen use, not a real per-item thumbnail (the mock's own swatch is
 * a flat gradient, not an image, even for its YouTube example items).
 */
export function PackTopItemsList({
  items,
  coverTone,
  label,
  ownPicks,
}: {
  items: ItemTally[];
  coverTone: string;
  label?: string;
  ownPicks?: RecordedPick[] | null;
}) {
  const t = useTranslations("result");
  const [shown, setShown] = useState(PAGE);
  const ranked = useMemo(() => rankTallies(items), [items]);
  const visible = ranked.slice(0, shown);
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
    <div
      role="table"
      aria-label={label ?? t("topPickedHeading")}
      // A real CSS grid, not a flex column of independent rows: flexbox sizes
      // each row from scratch, so the bar column ends up a different width
      // per row (and, worse, whatever's left over after a long title eats the
      // row's flex-shrink budget). A grid's columns are ONE set of tracks
      // shared by every row, so the bar column is identical on every row.
      // Title and bar split whatever's left after the fixed columns at a 2:1
      // ratio (2fr / 1fr) — title stays the dominant, readable element (not
      // shrunk down to a stub to make the bar "full width") while the bar
      // still gets a real, consistent, non-trivial share rather than a fixed
      // few px.
      className="grid grid-cols-[18px_44px_minmax(0,2fr)_minmax(28px,1fr)_50px_36px] items-center gap-x-2 gap-y-2.5"
    >
      {visible.map((item, index) => (
        <div key={item.itemId} role="row" className="contents">
          <span
            role="cell"
            className="text-[12.5px] font-bold tabular-nums text-foreground-tertiary"
          >
            {item.rank}
          </span>
          <span
            role="cell"
            aria-hidden
            className="aspect-video rounded-[7px]"
            style={{
              background: `linear-gradient(150deg, ${toneFor(coverTone, index)}, #0b0c0f)`,
            }}
          />
          <Text
            as="span"
            role="cell"
            className={cn(
              "min-w-0 truncate text-[13.5px]",
              mine.has(item.itemId) ? "font-bold" : "font-semibold",
            )}
          >
            {item.itemTitle}
          </Text>
          <ProgressBar value={item.percentage} />
          <Text
            as="span"
            role="cell"
            variant="tertiary"
            className="text-end text-[11px]"
          >
            {t("pickedOfAppeared", {
              picked: item.picked,
              appeared: item.appeared,
            })}
          </Text>
          <Text
            as="span"
            role="cell"
            className="text-end text-[12.5px] font-bold text-acc"
          >
            {item.percentage}%
          </Text>
        </div>
      ))}
      {visible.length < ranked.length && (
        <Button
          variant="ghost"
          onClick={() => setShown((n) => n + PAGE)}
          className="col-span-6 mt-1.5 justify-self-center"
        >
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
}
