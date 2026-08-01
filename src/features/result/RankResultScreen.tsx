"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { RecapHeading } from "@/src/features/result/RecapHeading";
import { RankedList } from "@/src/shared/components/RankedList";
import { roundHeading } from "@/src/shared/lib/round-heading";
import type { Pack } from "@/src/shared/types/pack";
import type {
  RankResults,
  RankResultItem,
  RecordedPick,
} from "@/src/shared/types/play-results";

/**
 * The rank_blind result: each round you played as one card, your ranking from
 * first place to last, with where each item came in the draw.
 *
 * `ownPicks`/`shared` come from ResultScreen rather than a second
 * useResultPicks call here (#243). Re-reading gave this screen its own copy of
 * the hook's after-mount state, so it rendered once without the picks and
 * again with them — a flash of the full pool before the viewer's own ranking.
 */
export function RankResultScreen({
  pack,
  results,
  ownPicks,
  shared,
}: {
  pack: Pack;
  results: RankResults;
  ownPicks: RecordedPick[] | null;
  shared: boolean;
}) {
  const t = useTranslations("result");

  // The podium (pack-wide ranking) is no longer rendered here — it's a
  // right-aside card in the mock, not part of the recap column. ResultScreen
  // renders it directly, keyed to the same `results.format`.
  return (
    <div className="flex-1 pb-10">
      <section className="flex min-w-0 flex-col gap-[13px]">
        <RecapHeading shared={shared} />
        {/* Cards, so a gap between them — the hairline `divide-y` separators
            were carrying the visual break that each card's own border now
            does. */}
        <div className="flex flex-col gap-[10px]">
          {results.rounds.map((round) => {
            const roundPicks =
              ownPicks?.filter(
                (pick) => pick.roundIndex === round.roundIndex,
              ) ?? [];
            const playedThisRound = roundPicks.length > 0;
            // A round can sample a random subset of its pool, so the aggregate
            // includes items this player never saw. When they played the round,
            // show only the items that were in THEIR play; otherwise (viewing
            // aggregate-only, no recorded play) fall back to the full pool so the
            // round isn't blank.
            const visibleItems = playedThisRound
              ? round.items.filter((item) =>
                  roundPicks.some((pick) => pick.itemId === item.itemId),
                )
              : round.items;
            // Drop never-ranked items (averagePosition 0 sentinel). In the
            // aggregate fallback the full pool can include items nobody ranked,
            // whose 0 would otherwise sort them above genuine first places.
            const rankable = visibleItems.filter(
              (item) => item.timesRanked > 0,
            );
            const pickFor = (item: RankResultItem) =>
              roundPicks.find((pick) => pick.itemId === item.itemId);
            // A round you played is YOUR ranking, first place to last (#338).
            // The crowd's average only orders the fallback, where there is no
            // "your ranking" to show.
            const sortedItems = playedThisRound
              ? [...rankable].sort(
                  (a, b) =>
                    (pickFor(a)?.position ?? Number.MAX_SAFE_INTEGER) -
                    (pickFor(b)?.position ?? Number.MAX_SAFE_INTEGER),
                )
              : [...rankable].sort(
                  (a, b) => a.averagePosition - b.averagePosition,
                );

            if (sortedItems.length === 0) return null;

            // T9: a ranked list has no single "winner" the way an elimination
            // or versus round does — the closest analogue is the item that
            // landed #1 this round, so that's what the verdict line names.
            const firstPlace = sortedItems[0];

            return (
              <RankedList
                key={round.roundIndex}
                // The round's name and verdict belong INSIDE the card, the way
                // an elimination round card carries its own — outside it they
                // read as loose text above an unrelated box.
                header={
                  <div className="flex flex-col gap-[4px] px-1 pb-1">
                    <Text
                      variant="tertiary"
                      className="text-xs uppercase tracking-wide"
                    >
                      {roundHeading(pack, round.roundIndex)}
                    </Text>
                    {playedThisRound && firstPlace && (
                      <Text className="text-[11px] font-semibold uppercase tracking-wide text-success">
                        {t(
                          shared
                            ? "verdictRankedFirstShared"
                            : "verdictRankedFirst",
                          { name: firstPlace.itemTitle },
                        )}
                      </Text>
                    )}
                  </div>
                }
                rows={sortedItems.map((item) => ({
                  id: item.itemId,
                  title: item.itemTitle,
                  drawIndex: pickFor(item)?.drawIndex,
                }))}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
