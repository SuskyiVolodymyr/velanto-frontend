"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import {
  ColumnHeading,
  RankCell,
  styleForRank,
  withCompetitionRanks,
} from "@/src/features/result/result-table";
import type { ItemTally } from "@/src/shared/types/play-results";

/** How many rows a press of "Load more" adds. */
const PAGE = 10;

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
 */
export function TopPickedTable({
  items,
  label,
}: {
  items: ItemTally[];
  label?: string;
}) {
  const t = useTranslations("result");
  const tableLabel = label ?? t("topPickedHeading");
  const [shown, setShown] = useState(PAGE);
  const ranked = useMemo(() => rankTallies(items), [items]);
  const visible = ranked.slice(0, shown);

  return (
    <>
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
              <ColumnHeading align="end" className="w-20">
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
                    <Text as="span" className="text-sm font-semibold">
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
                    <Text
                      as="span"
                      className="text-sm font-semibold tabular-nums text-acc"
                    >
                      {item.percentage}%
                    </Text>
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
    </>
  );
}
