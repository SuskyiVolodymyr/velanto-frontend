"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ProgressBar } from "@/src/shared/components/ProgressBar";
import { cn } from "@/src/shared/lib/cn";
import {
  ColumnHeading,
  RankCell,
  styleForRank,
  withCompetitionRanks,
} from "@/src/features/result/result-table";
import type { ItemTally, RecordedPick } from "@/src/shared/types/play-results";

/** How many rows a press of "Load more" adds — mock starts at 5, was 10 (T11). */
const PAGE = 5;

interface RankedTally extends ItemTally {
  rank: number;
}

/**
 * The table's rows in competition order. Two items tie only when BOTH their
 * share and their pick count match — the same percentage off a different number
 * of rounds is not the same result.
 */
function rankTallies(items: ItemTally[]): RankedTally[] {
  return withCompetitionRanks(
    items,
    (item) => `${item.percentage}|${item.picked}`,
  );
}

/**
 * The pack-wide "top picked" ranking: how often each item was picked of the
 * rounds it turned up in. Shown on every versus and elimination result screen
 * and on those packs' detail pages, where it replaces the generic per-round
 * stats — "what wins most" IS the interesting statistic for all of them.
 *
 * `label` names the table for assistive tech; the elimination screens pass
 * their own ("Most saved" / "Most sacrificed"), which is the same number under
 * a verb that matches what the player actually did.
 *
 * T11: restyled as a rounded-20 aside card (`bg-surface-card`), and
 * `ownPicks` (when passed) bolds any row the viewer picked at some point in
 * their own run — the mock's "mine" flag.
 */
export function TopPickedTable({
  items,
  label,
  ownPicks,
}: {
  items: ItemTally[];
  label?: string;
  ownPicks?: RecordedPick[] | null;
}) {
  const t = useTranslations("result");
  const tableLabel = label ?? t("topPickedHeading");
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
    <div className="rounded-[20px] border border-border bg-surface-card p-5">
      <div className="overflow-x-auto">
        <table
          aria-label={tableLabel}
          className="w-full border-separate border-spacing-y-2"
        >
          <thead>
            <tr>
              <ColumnHeading className="w-12">
                {t("topPickedRankColumn")}
              </ColumnHeading>
              <ColumnHeading>{t("topPickedItemColumn")}</ColumnHeading>
              <ColumnHeading align="end">
                {t("topPickedPickedColumn")}
              </ColumnHeading>
              <ColumnHeading align="end" className="w-32">
                {t("topPickedShareColumn")}
              </ColumnHeading>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const style = styleForRank(item.rank);
              return (
                <tr key={item.itemId} data-rank={item.rank}>
                  <RankCell style={style} first>
                    <Text
                      as="span"
                      className="text-sm font-semibold tabular-nums"
                    >
                      {item.rank}
                    </Text>
                  </RankCell>
                  <RankCell style={style}>
                    <Text
                      as="span"
                      className={cn(
                        "text-sm",
                        mine.has(item.itemId) ? "font-bold" : "font-semibold",
                      )}
                    >
                      {item.itemTitle}
                    </Text>
                  </RankCell>
                  <RankCell style={style} align="end">
                    <Text as="span" variant="tertiary" className="text-xs">
                      {t("pickedOfAppeared", {
                        picked: item.picked,
                        appeared: item.appeared,
                      })}
                    </Text>
                  </RankCell>
                  <RankCell style={style} align="end" last>
                    {/* The bar is decorative — the percentage right beside it
                        already says the same thing as text, so the bar stays
                        out of the accessibility tree rather than making every
                        row's share announce twice. */}
                    <div className="flex items-center justify-end gap-2.5">
                      <span aria-hidden className="contents">
                        <ProgressBar value={item.percentage} className="w-14" />
                      </span>
                      <Text
                        as="span"
                        className="text-sm font-semibold tabular-nums text-acc"
                      >
                        {item.percentage}%
                      </Text>
                    </div>
                  </RankCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length < ranked.length && (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => setShown((n) => n + PAGE)}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
