"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { PodiumTable } from "@/src/features/result/PodiumTable";
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
  // Unused now that the header block + SharedResultNote that read it moved to
  // ResultScreen (T11); kept in the signature so this still matches
  // ResultScreen's shared { pack, results, ownPicks, shared } call shape
  // across all four format screens, and so this file's own tests (which
  // already pass it) don't need a T11 edit.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shared,
}: {
  pack: Pack;
  results: RankResults;
  ownPicks: RecordedPick[] | null;
  shared: boolean;
}) {
  const t = useTranslations("result");
  const podium = results.podium ?? [];

  return (
    <div className="flex-1 pb-10">
      <section className="mb-10">
        <Text
          as="h2"
          variant="tertiary"
          className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-acc"
        >
          {t("roundByRoundHeading")}
        </Text>
        <Text variant="secondary" className="mb-4 text-sm">
          {t("roundByRoundNote")}
        </Text>
        <div className="flex flex-col divide-y divide-border">
        {results.rounds.map((round) => {
          const roundPicks =
            ownPicks?.filter((pick) => pick.roundIndex === round.roundIndex) ??
            [];
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
          const rankable = visibleItems.filter((item) => item.timesRanked > 0);
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
            <div key={round.roundIndex} className="py-4 first:pt-0 last:pb-0">
              <Text
                variant="tertiary"
                className="mb-2 text-xs uppercase tracking-wide"
              >
                {roundHeading(pack, round.roundIndex)}
              </Text>
              {playedThisRound && firstPlace && (
                <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7EE7B4]">
                  {t("verdictRankedFirst", { name: firstPlace.itemTitle })}
                </Text>
              )}
              <RankedList
                rows={sortedItems.map((item) => ({
                  id: item.itemId,
                  title: item.itemTitle,
                  drawIndex: pickFor(item)?.drawIndex,
                }))}
              />
            </div>
          );
        })}
        </div>
      </section>

      {podium.length > 0 && (
        <section className="mb-8">
          <Text
            as="h2"
            variant="tertiary"
            className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em]"
          >
            {t("podiumHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t("podiumSubtitle")}
          </Text>
          <PodiumTable items={podium} />
        </section>
      )}
    </div>
  );
}
