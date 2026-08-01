"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { RecapHeading } from "@/src/features/result/RecapHeading";
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
  ownPicks,
  shared,
}: {
  pack: Pack;
  // Still accepted (ResultScreen passes it uniformly to all 4 recap
  // screens) but no longer read here — the pack-wide ranking that used to
  // read it moved to ResultScreen's own aside board.
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

  // The pack-wide ranking (topItems) is no longer rendered here — it's a
  // right-aside card in the mock, not part of the recap column. ResultScreen
  // renders it directly, keyed to the same `results.format`.
  return (
    <>
      {rounds.length > 0 ? (
        <section className="flex min-w-0 flex-col gap-[13px]">
          <RecapHeading shared={shared} />
          <div className="flex flex-col gap-[10px]">
            {rounds.map((round) => (
              <RoundCard
                key={round.roundIndex}
                round={round}
                heading={roundHeading(pack, round.roundIndex)}
                sacrifice={sacrifice}
                shared={shared}
              />
            ))}
          </div>
        </section>
      ) : (
        <Card className="py-8 text-center">
          <Text variant="tertiary" className="text-sm">
            {t("noRoundBreakdown")}
          </Text>
        </Card>
      )}
    </>
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
      // Mock (`Results.dc.html` → `[data-el="roundrow"]`): each round is its
      // OWN card — 14px padding, 16px radius, card surface, hairline border —
      // collapsing to one column at 720px.
      //
      // The mock's left track is `auto`, which sizes to that card's own
      // content. Each round is a SEPARATE grid, so `auto` gives every card a
      // different title width and the dividers zig-zag down the column; the
      // mock's data hides this because its winner names are all two short
      // words. A fixed 240px track keeps every card's title block — and so
      // every divider — on the same line.
      className="grid grid-cols-1 gap-[14px] rounded-[16px] border border-border bg-surface-card p-[14px] min-[721px]:grid-cols-[240px_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 flex-col gap-[9px]">
        <div className="flex items-center gap-[10px]">
          <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[8px] bg-white/[0.06] font-mono text-[11.5px] font-bold tabular-nums text-foreground-tertiary">
            {round.roundIndex + 1}
          </span>
          {/* Mock renders the round's own name in plain sentence case (13px/
              650) — it's real author-chosen text, not a caps label like the
              verdict/"LOST" tags beside it. */}
          <Text
            variant="secondary"
            className="truncate text-[13px] font-semibold"
          >
            {heading}
          </Text>
        </div>
        {picked && (
          <div
            data-testid="picked"
            data-outcome={sacrifice ? "sacrificed" : "saved"}
            className="flex min-w-0 flex-col gap-[4px]"
          >
            <Text
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.1em]",
                sacrifice ? "text-danger" : "text-success",
              )}
            >
              {verdictText}
            </Text>
            <Text className="text-pretty text-[15px] font-semibold tracking-[-0.01em]">
              {picked.title}
            </Text>
          </div>
        )}
      </div>

      {others.length > 0 && (
        // Mock divides the two columns with a left hairline. Below 720px the
        // grid is one column, where a LEFT rule would read as decoration
        // hanging off the stacked block — it becomes the top rule instead.
        <div className="flex min-w-0 flex-col gap-[8px] border-t border-white/[0.06] pt-3 min-[721px]:border-s min-[721px]:border-t-0 min-[721px]:ps-[14px] min-[721px]:pt-0">
          <Text className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/[0.35]">
            {otherLabel}
          </Text>
          <ul className="flex list-none flex-wrap gap-[7px]">
            {others.map((item) => (
              <li
                key={item.itemId}
                className="flex h-[30px] items-center rounded-pill border border-border bg-background px-3 text-[12px] font-semibold text-foreground-secondary"
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
