"use client";

import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import { PodiumTable } from "@/src/features/result/PodiumTable";
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
  const podium = results.podium ?? [];

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

      <div className="mb-10 flex flex-col divide-y divide-border">
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

          return (
            <div key={round.roundIndex} className="py-4 first:pt-0 last:pb-0">
              <Text
                variant="tertiary"
                className="mb-2 text-xs uppercase tracking-wide"
              >
                {roundHeading(pack, round.roundIndex)}
              </Text>
              <ul className="flex flex-col gap-2 rounded-xl border border-border p-3">
                {sortedItems.map((item, index) => {
                  const drawIndex = pickFor(item)?.drawIndex;
                  return (
                    <li
                      key={item.itemId}
                      className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                    >
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold tabular-nums">
                        {index + 1}
                      </span>
                      <Text className="flex-1 truncate text-sm font-semibold">
                        {item.itemTitle}
                      </Text>
                      {/* Where it came in the DRAW. Ranking blind means the
                          order items arrived in is what you were reacting to,
                          and this list is sorted by where they ended up — so
                          without it the run can't be read back. Absent on
                          plays recorded before #338. */}
                      {drawIndex !== undefined && (
                        <Text
                          variant="tertiary"
                          className="flex-none text-xs tabular-nums"
                        >
                          {t("shownAt", { n: drawIndex + 1 })}
                        </Text>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {podium.length > 0 && (
        <section className="mb-8">
          <Text as="h2" variant="title" className="mb-1 text-lg">
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
