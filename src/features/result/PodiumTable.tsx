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
import type { PodiumTally } from "@/src/shared/types/play-results";

/** How many rows a press of "Load more" adds. */
const PAGE = 10;

/**
 * rank_blind's pack-wide ranking: how often each item was placed first, second
 * or third, ordered by the three combined.
 *
 * The sum ranks rather than the firsts alone because a rank_blind round is a
 * whole ordering, not a single pick — an item reliably near the top says more
 * about a pack than one that occasionally wins and is mid-table otherwise. The
 * three counts stay visible beside it, so a reader can see which kind of item
 * they're looking at instead of taking the sum on trust.
 */
export function PodiumTable({ items }: { items: PodiumTally[] }) {
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

  return (
    <>
      <div className="overflow-x-auto">
        <table
          aria-label={t("podiumHeading")}
          className="w-full border-separate border-spacing-y-2"
        >
          <thead>
            <tr>
              <ColumnHeading className="w-12">
                {t("topPickedRankColumn")}
              </ColumnHeading>
              <ColumnHeading>{t("topPickedItemColumn")}</ColumnHeading>
              <ColumnHeading align="end" className="w-14">
                {t("podiumFirstColumn")}
              </ColumnHeading>
              <ColumnHeading align="end" className="w-14">
                {t("podiumSecondColumn")}
              </ColumnHeading>
              <ColumnHeading align="end" className="w-14">
                {t("podiumThirdColumn")}
              </ColumnHeading>
              <ColumnHeading align="end" className="w-16">
                {t("podiumTotalColumn")}
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
                  <PlacementCell style={style} count={item.first} />
                  <PlacementCell style={style} count={item.second} />
                  <PlacementCell style={style} count={item.third} />
                  <RankCell style={style} align="end" last>
                    <Text
                      as="span"
                      className="text-sm font-semibold tabular-nums text-acc"
                    >
                      {item.total}
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

/**
 * One placement count. A zero is dimmed rather than blank: the columns line up
 * as a shape you can read across, which an empty cell breaks.
 */
function PlacementCell({
  style,
  count,
}: {
  style: { border: string; background: string };
  count: number;
}) {
  return (
    <RankCell style={style} align="end">
      <Text
        as="span"
        variant={count === 0 ? "tertiary" : undefined}
        className="text-sm tabular-nums"
      >
        {count}
      </Text>
    </RankCell>
  );
}
