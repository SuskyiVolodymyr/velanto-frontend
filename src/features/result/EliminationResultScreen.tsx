"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
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
    <div className="flex-1 pb-10">
      {rounds.length > 0 ? (
        <section className="mb-10">
          <Text
            as="h2"
            variant="tertiary"
            className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-acc"
          >
            {t("roundByRoundHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t(shared ? "roundByRoundNoteShared" : "roundByRoundNote")}
          </Text>
          <div className="flex flex-col divide-y divide-border">
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
        </section>
      ) : (
        <Card className="mb-10 py-8 text-center">
          <Text variant="tertiary" className="text-sm">
            {t("noRoundBreakdown")}
          </Text>
        </Card>
      )}

      {topItems.length > 0 && (
        <section className="mb-8">
          <Text
            as="h2"
            variant="tertiary"
            className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em]"
          >
            {t(sacrifice ? "topSacrificedHeading" : "topSavedHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t(sacrifice ? "topSacrificedSubtitle" : "topSavedSubtitle")}
          </Text>
          <TopPickedTable
            items={topItems}
            label={t(sacrifice ? "topSacrificedHeading" : "topSavedHeading")}
            ownPicks={ownPicks}
          />
        </section>
      )}
    </div>
  );
}

/**
 * One played round (T9): round-number chip + name and a verdict block on the
 * left (a colored "YOU SAVED"/"YOU SACRIFICED" label plus the picked item's
 * name), the round's OTHER elements as wrapped pill chips on the right,
 * divided from the left by a border — replaces the earlier "every element its
 * own full-width bordered row" list.
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
  const others = round.items.filter((item) => !item.picked);
  const verdictText = sacrifice
    ? shared
      ? t("verdictSacrificeShared")
      : t("verdictSacrifice")
    : shared
      ? t("verdictSaveShared")
      : t("verdictSave");
  const otherLabel = sacrifice ? t("survivedLabel") : t("lostLabel");

  return (
    <div
      role="group"
      aria-label={t("eliminationRoundLabel", {
        heading,
        picked: picked?.title ?? "",
      })}
      className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]"
    >
      <div className="min-w-0 sm:max-w-[220px]">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-chip bg-white/[0.06] text-[11px] font-bold tabular-nums">
            {round.roundIndex + 1}
          </span>
          <Text
            variant="tertiary"
            className="truncate text-xs uppercase tracking-wide"
          >
            {heading}
          </Text>
        </div>
        {picked && (
          <div
            data-testid="picked"
            data-outcome={sacrifice ? "sacrificed" : "saved"}
          >
            <Text
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                sacrifice ? "text-danger" : "text-success",
              )}
            >
              {verdictText}
            </Text>
            <Text className="mt-1 text-[15px] font-bold">{picked.title}</Text>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="border-t border-border pt-3 sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0">
          <Text
            variant="tertiary"
            className="mb-2 text-[11px] uppercase tracking-wide"
          >
            {otherLabel}
          </Text>
          <ul className="flex list-none flex-wrap gap-2">
            {others.map((item) => (
              <li
                key={item.itemId}
                className="rounded-pill border border-border bg-white/[0.03] px-3 py-1 text-xs text-foreground-secondary"
              >
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
