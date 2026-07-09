"use client";

import Link from "next/link";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import { ShareButton } from "@/src/features/share/ShareButton";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

export function ResultScreen({ pack, results }: { pack: Pack; results: PackResults | RankResults }) {
  if (results.format === "rank_blind") {
    return <RankResultScreen pack={pack} results={results} />;
  }
  return <GroupResultScreen pack={pack} results={results} />;
}

function GroupResultScreen({ pack, results }: { pack: Pack; results: PackResults }) {
  const { picks: ownPicks, shared } = useResultPicks(pack.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        Result
      </Text>
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {pack.title}
      </Text>
      <Text variant="secondary" className="mb-8">
        {results.totalPlays} play{results.totalPlays === 1 ? "" : "s"} recorded.
      </Text>

      {shared && (
        <Text
          variant="secondary"
          className="mb-6 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm"
        >
          You&apos;re viewing a shared result.
        </Text>
      )}

      <div className="mb-8 flex flex-col gap-4">
        {results.rounds.map((round) => {
          const ownPick = ownPicks?.find((pick) => pick.groupId === round.groupId);
          const ownItem = ownPick
            ? round.items.find((item) => item.itemId === ownPick.itemId)
            : undefined;

          return (
            <Card key={round.groupId} className="hover:translate-y-0 hover:shadow-none">
              <Text className="mb-2 font-semibold">{round.groupName}</Text>
              {ownItem ? (
                <div className="flex items-center justify-between gap-2">
                  <Text variant="secondary" className="text-sm">
                    {shared ? "Pick" : "Your pick"}: {ownItem.itemTitle}
                  </Text>
                  <Text className="text-sm font-semibold text-acc">
                    {ownItem.percentage}%
                  </Text>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {round.items.map((item) => (
                    <li key={item.itemId} className="flex items-center justify-between gap-2">
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

      <div className="flex items-center gap-3">
        <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "w-fit")}>
          Play again
        </Link>
        {pack.status === "approved" && (
          <ShareButton
            path={`/packs/${pack.id}/result`}
            picks={ownPicks}
            label="Share result"
          />
        )}
      </div>
    </div>
  );
}
