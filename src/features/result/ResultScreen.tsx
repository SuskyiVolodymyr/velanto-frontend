"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

export function ResultScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults | RankResults;
}) {
  if (results.format === "rank_blind") {
    return <RankResultScreen pack={pack} results={results} />;
  }
  return <GroupResultScreen pack={pack} results={results} />;
}

function GroupResultScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults;
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

      <div className="mb-8 flex flex-col gap-4">
        {results.rounds.map((round) => {
          const ownPick = ownPicks?.find(
            (pick) => pick.roundIndex === round.roundIndex,
          );
          // Count formats key each round's items by item id; versus formats key
          // them by the SIDE's group id (a versus pick carries no itemId), so
          // fall back to the pick's groupId when there's no itemId.
          const ownKey = ownPick
            ? (ownPick.itemId ?? ownPick.groupId)
            : undefined;
          const ownItem =
            ownKey !== undefined
              ? round.items.find((item) => item.itemId === ownKey)
              : undefined;

          return (
            <Card
              key={round.roundIndex}
              className="hover:translate-y-0 hover:shadow-none"
            >
              <Text className="mb-2 font-semibold">
                {`Round ${round.roundIndex + 1}`}
              </Text>
              {ownItem ? (
                <div className="flex items-center justify-between gap-2">
                  <Text variant="secondary" className="text-sm">
                    {shared ? t("sharedPick") : t("yourPick")}:{" "}
                    {ownItem.itemTitle}
                  </Text>
                  <Text className="text-sm font-semibold text-acc">
                    {ownItem.percentage}%
                  </Text>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {round.items.map((item) => (
                    <li
                      key={item.itemId}
                      className="flex items-center justify-between gap-2"
                    >
                      <Text variant="secondary" className="text-sm">
                        {item.itemTitle}
                      </Text>
                      <Text variant="tertiary" className="text-sm">
                        {item.percentage}%
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <ResultActions packId={pack.id} status={pack.status} picks={ownPicks} />
    </div>
  );
}
