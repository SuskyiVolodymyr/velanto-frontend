"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import type { Pack } from "@/src/shared/types/pack";
import type { RankResults } from "@/src/shared/types/play-results";

export function RankResultScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: RankResults;
}) {
  const t = useTranslations("result");
  const { picks: ownPicks, shared } = useResultPicks(pack.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
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

      <div className="mb-8 flex flex-col gap-6">
        {results.rounds.map((round) => {
          const playedThisRound =
            ownPicks?.some((pick) => pick.roundIndex === round.roundIndex) ??
            false;
          // A round can sample a random subset of its pool, so the aggregate
          // includes items this player never saw. When they played the round,
          // show only the items that were in THEIR play; otherwise (viewing
          // aggregate-only, no recorded play) fall back to the full pool so the
          // round isn't blank.
          const visibleItems = playedThisRound
            ? round.items.filter((item) =>
                ownPicks?.some(
                  (pick) =>
                    pick.roundIndex === round.roundIndex &&
                    pick.itemId === item.itemId,
                ),
              )
            : round.items;
          const sortedItems = [...visibleItems].sort(
            (a, b) => a.averagePosition - b.averagePosition,
          );

          return (
            <div key={round.roundIndex}>
              <Text className="mb-3 font-semibold">
                {`Round ${round.roundIndex + 1}`}
              </Text>
              <div className="flex flex-col gap-3">
                {sortedItems.map((item, index) => {
                  const ownPick = ownPicks?.find(
                    (pick) =>
                      pick.roundIndex === round.roundIndex &&
                      pick.itemId === item.itemId,
                  );
                  const maxCount = Math.max(...item.positionCounts, 1);

                  return (
                    <Card
                      key={item.itemId}
                      className="hover:translate-y-0 hover:shadow-none"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold">
                          {index + 1}
                        </span>
                        <Text className="flex-1 font-semibold">
                          {item.itemTitle}
                        </Text>
                        <Text variant="tertiary" className="text-xs">
                          {t("rankCaption", {
                            avg: item.averagePosition,
                            count: item.timesRanked,
                          })}
                        </Text>
                      </div>
                      <div className="mb-2 flex items-end gap-1 pl-10">
                        {item.positionCounts.map((count, position) => {
                          const isOwn = ownPick?.position === position;
                          return (
                            <div
                              key={position}
                              className="flex flex-col items-center gap-1"
                            >
                              <div
                                className={
                                  isOwn
                                    ? "w-[18px] rounded-sm bg-acc ring-2 ring-foreground"
                                    : "w-[18px] rounded-sm bg-acc/30"
                                }
                                style={{
                                  height: `${Math.max((count / maxCount) * 32, 2)}px`,
                                }}
                              />
                              <Text variant="tertiary" className="text-[10px]">
                                #{position + 1}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                      {ownPick && ownPick.position !== undefined && (
                        <Text className="pl-10 text-xs text-acc">
                          {t(shared ? "placed" : "youPlaced", {
                            position: ownPick.position + 1,
                            count: Math.max(
                              (item.positionCounts[ownPick.position] ?? 0) - 1,
                              0,
                            ),
                          })}
                        </Text>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ResultActions packId={pack.id} status={pack.status} picks={ownPicks} />
    </div>
  );
}
