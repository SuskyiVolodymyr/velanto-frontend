"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import type { Pack } from "@/src/shared/types/pack";
import type { RankResults, RecordedPick } from "@/src/shared/types/play-results";

export function RankResultScreen({ pack, results }: { pack: Pack; results: RankResults }) {
  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);

  // sessionStorage doesn't exist during server rendering — same rationale as
  // ResultScreen's own effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(pack.id));
  }, [pack.id]);

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

      <div className="mb-8 flex flex-col gap-6">
        {results.rounds.map((round) => {
          const sortedItems = [...round.items].sort(
            (a, b) => a.averagePosition - b.averagePosition,
          );
          const playedThisRound = ownPicks?.some((pick) => pick.groupId === round.groupId) ?? false;

          return (
            <div key={round.groupId}>
              <Text className="mb-3 font-semibold">{round.groupName}</Text>
              <div className="flex flex-col gap-3">
                {sortedItems.map((item, index) => {
                  const ownPick = ownPicks?.find(
                    (pick) => pick.groupId === round.groupId && pick.itemId === item.itemId,
                  );
                  const maxCount = Math.max(...item.positionCounts, 1);

                  return (
                    <Card key={item.itemId} className="hover:translate-y-0 hover:shadow-none">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold">
                          {index + 1}
                        </span>
                        <Text className="flex-1 font-semibold">{item.itemTitle}</Text>
                        <Text variant="tertiary" className="text-xs">
                          avg {item.averagePosition} · ranked {item.timesRanked}x
                        </Text>
                      </div>
                      <div className="mb-2 flex items-end gap-1 pl-10">
                        {item.positionCounts.map((count, position) => {
                          const isOwn = ownPick?.position === position;
                          return (
                            <div key={position} className="flex flex-col items-center gap-1">
                              <div
                                className={
                                  isOwn
                                    ? "w-[18px] rounded-sm bg-acc ring-2 ring-white"
                                    : "w-[18px] rounded-sm bg-acc/30"
                                }
                                style={{ height: `${Math.max((count / maxCount) * 32, 2)}px` }}
                              />
                              <Text variant="tertiary" className="text-[10px]">
                                #{position + 1}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                      {ownPick && ownPick.position !== undefined ? (
                        <Text className="pl-10 text-xs text-acc">
                          You placed this #{ownPick.position + 1} ·{" "}
                          {Math.max(item.positionCounts[ownPick.position] - 1, 0)} other play
                          {item.positionCounts[ownPick.position] - 1 === 1 ? "" : "s"} agreed
                        </Text>
                      ) : (
                        playedThisRound && (
                          <Text variant="tertiary" className="pl-10 text-xs">
                            Not in your play this round
                          </Text>
                        )
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "w-fit")}>
        Play again
      </Link>
    </div>
  );
}
