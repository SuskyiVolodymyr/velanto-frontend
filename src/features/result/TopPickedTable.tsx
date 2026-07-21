"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import type { ItemTally } from "@/src/shared/types/play-results";

/** How many rows a press of "Load more" adds. */
const PAGE = 10;

/**
 * Outline and fill for each podium place; anything past third keeps the plain
 * border and surface.
 *
 * The two are chosen TOGETHER rather than layered, because `cn()` is a plain
 * join: appending `bg-medal-gold/10` to `bg-surface` leaves both classes on the
 * element and the cascade picks by stylesheet order, not class order (see
 * Text.tsx). Each place therefore names its own complete pair.
 */
const MEDAL_STYLES: Record<number, { border: string; background: string }> = {
  1: { border: "border-medal-gold", background: "bg-medal-gold/10" },
  2: { border: "border-medal-silver", background: "bg-medal-silver/10" },
  3: { border: "border-medal-bronze", background: "bg-medal-bronze/10" },
};

const PLAIN_STYLES = { border: "border-border", background: "bg-surface" };

interface RankedTally extends ItemTally {
  /**
   * Competition rank: equal scores share a place and the next one skips
   * accordingly (1, 1, 3). Two items tie only when BOTH their share and their
   * pick count match — the same percentage off a different number of matchups
   * is not the same result.
   */
  rank: number;
}

export function rankTallies(items: ItemTally[]): RankedTally[] {
  let previousKey: string | null = null;
  let previousRank = 0;
  return items.map((item, index) => {
    const key = `${item.percentage}|${item.picked}`;
    const rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = rank;
    return { ...item, rank };
  });
}

/**
 * The pack-wide "top picked" ranking: how often each item won the matchups it
 * turned up in. Shown on the 1v1 result screen and on a 1v1 pack's detail page,
 * where it replaces the generic per-round stats — for a head-to-head pack, "who
 * wins most" IS the interesting statistic.
 */
export function TopPickedTable({ items }: { items: ItemTally[] }) {
  const t = useTranslations("result");
  const [shown, setShown] = useState(PAGE);
  const ranked = useMemo(() => rankTallies(items), [items]);
  const visible = ranked.slice(0, shown);

  return (
    <>
      <div className="overflow-x-auto">
        <table
          aria-label={t("topPickedHeading")}
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
              // Keyed on RANK, not row order: tied firsts are both gold and the
              // next row is third, so it takes bronze and silver goes
              // unawarded — which is the point of sharing a place.
              const style = MEDAL_STYLES[item.rank] ?? PLAIN_STYLES;
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

function ColumnHeading({
  children,
  align = "start",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3",
        align === "end" ? "text-end" : "text-start",
        className,
      )}
    >
      <Text
        as="span"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {children}
      </Text>
    </th>
  );
}

/**
 * A cell of the table. The row's outline is drawn per CELL rather than on the
 * `tr`, because a border on a table row doesn't render with
 * `border-collapse: separate` — the rounded ends come from the first and last
 * cell dropping their inner edge.
 */
function RankCell({
  children,
  style,
  align = "start",
  first = false,
  last = false,
}: {
  children: React.ReactNode;
  style: { border: string; background: string };
  align?: "start" | "end";
  first?: boolean;
  last?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-y px-3 py-3",
        style.border,
        style.background,
        align === "end" ? "text-end" : "text-start",
        first && cn("rounded-s-xl border-s", style.border),
        last && cn("rounded-e-xl border-e", style.border),
      )}
    >
      {children}
    </td>
  );
}
