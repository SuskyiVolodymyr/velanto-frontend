"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import { TopPickedTable } from "@/src/features/result/TopPickedTable";
import { roundHeading } from "@/src/shared/lib/round-heading";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

interface PlayedItem {
  itemId: string;
  title: string;
  picked: boolean;
}

interface PlayedRound {
  roundIndex: number;
  items: PlayedItem[];
}

/**
 * Rebuild the viewer's own rounds from their picks: the elements each round
 * drew, in draw order, with the one they chose marked.
 *
 * An element counts as picked unless it is explicitly `chosen: false`. That is
 * what carries plays recorded before velanto-frontend#336, which stored the
 * winner alone with no `chosen` at all — such a round shows one element rather
 * than a slate, which is all it ever knew.
 */
function playedRounds(
  ownPicks: RecordedPick[] | null,
  titleById: Map<string, string>,
): PlayedRound[] {
  if (!ownPicks) return [];

  const byRound = new Map<number, PlayedItem[]>();
  for (const pick of ownPicks) {
    if (pick.itemId === undefined) continue;
    byRound.set(pick.roundIndex, [
      ...(byRound.get(pick.roundIndex) ?? []),
      {
        itemId: pick.itemId,
        // Titles come from the PACK. The picks carry ids only, and the results
        // aggregate knows an item's title only once some play has been counted.
        title: titleById.get(pick.itemId) ?? pick.itemId,
        picked: pick.chosen !== false,
      },
    ]);
  }

  return [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([roundIndex, items]) => ({ roundIndex, items }));
}

/**
 * The save_one / sacrifice_one result: each round you played as the slate it
 * drew, with your pick marked — green where you saved it, red where you
 * sacrificed it — followed by the pack-wide ranking.
 *
 * Deliberately carries no per-round crowd percentage. The one it used to show
 * was `count / totalPlays` across every item of the pool, which caps a
 * rarely-drawn item at how often the draw surfaces it and lists items that
 * never appeared at 0%. The ranking below is the same statistic with the
 * denominator it needs — appearances (velanto-frontend#336).
 */
export function EliminationResultScreen({
  pack,
  results,
  ownPicks,
  shared,
}: {
  pack: Pack;
  results: PackResults;
  ownPicks: RecordedPick[] | null;
  shared: boolean;
}) {
  const t = useTranslations("result");
  const sacrifice = pack.format === "sacrifice_one";

  const titleById = useMemo(
    () =>
      new Map(
        (pack.groups ?? []).flatMap((group) =>
          group.items.map((item) => [item.id, item.title] as const),
        ),
      ),
    [pack.groups],
  );
  const rounds = useMemo(
    () => playedRounds(ownPicks, titleById),
    [ownPicks, titleById],
  );
  const topItems = results.topItems ?? [];

  return (
    <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        {t("label")}
      </Text>
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {pack.title}
      </Text>
      <Text variant="secondary" className="mb-8">
        {t("playsRecorded", { count: results.totalPlays })}
      </Text>

      {shared && <SharedResultNote />}

      <ResultActions
        packId={pack.id}
        status={pack.status}
        picks={ownPicks}
        shared={shared}
        className="mb-6 justify-end"
      />

      {rounds.length > 0 ? (
        <div className="mb-10 flex flex-col divide-y divide-border">
          {rounds.map((round) => (
            <div key={round.roundIndex} className="py-4 first:pt-0 last:pb-0">
              <RoundCard
                round={round}
                heading={roundHeading(pack, round.roundIndex)}
                sacrifice={sacrifice}
                shared={shared}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="mb-10 py-8 text-center hover:translate-y-0 hover:shadow-none">
          <Text variant="tertiary" className="text-sm">
            {t("noRoundBreakdown")}
          </Text>
        </Card>
      )}

      {topItems.length > 0 && (
        <section className="mb-8">
          <Text as="h2" variant="title" className="mb-1 text-lg">
            {t(sacrifice ? "topSacrificedHeading" : "topSavedHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t(sacrifice ? "topSacrificedSubtitle" : "topSavedSubtitle")}
          </Text>
          <TopPickedTable
            items={topItems}
            label={t(sacrifice ? "topSacrificedHeading" : "topSavedHeading")}
          />
        </section>
      )}
    </div>
  );
}

/**
 * One played round: its name, then every element it drew in one card, each
 * element in its own container so a slate of eight doesn't run together.
 */
function RoundCard({
  round,
  heading,
  sacrifice,
  shared,
}: {
  round: PlayedRound;
  heading: string;
  sacrifice: boolean;
  shared: boolean;
}) {
  const t = useTranslations("result");
  const picked = round.items.find((item) => item.picked);

  return (
    <div
      role="group"
      aria-label={t("eliminationRoundLabel", {
        heading,
        picked: picked?.title ?? "",
      })}
    >
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        {heading}
      </Text>
      <ul className="flex flex-col gap-2 rounded-xl border border-border p-3">
        {round.items.map((item) => (
          <li
            key={item.itemId}
            {...(item.picked
              ? {
                  "data-testid": "picked",
                  "data-outcome": sacrifice ? "sacrificed" : "saved",
                }
              : {})}
            className={cn(
              "flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2",
              // Paired border+background rather than layered: cn() is a plain
              // join, so two backgrounds on one element are resolved by
              // stylesheet order, not class order (see Text.tsx).
              !item.picked
                ? "border-white/[0.06] bg-white/[0.03]"
                : sacrifice
                  ? "border-danger/60 bg-danger/10"
                  : "border-success/60 bg-success/10",
            )}
          >
            <Text className="truncate text-sm font-semibold">{item.title}</Text>
            {item.picked && (
              <Text
                variant="tertiary"
                className="shrink-0 text-xs uppercase tracking-wide"
              >
                {shared ? t("sharedPick") : t("yourPick")}
              </Text>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
