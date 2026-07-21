"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { resolveRoundSelections } from "@/src/features/play/round-sampling";
import { HeadToHeadRound } from "@/src/features/play/HeadToHeadRound";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

interface MatchupResult {
  winnerTitle: string;
  loserTitle: string;
}

export function HeadToHeadPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const t = useTranslations("play");
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [history, setHistory] = useState<MatchupResult[]>([]);
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);

  const isFinished = totalRounds > 0 && roundIndex >= totalRounds;
  // Drawn items for every round, resolved once at mount (dedup spans rounds).
  // A 1v1 round has two slots (the two sides); each draws exactly one item, so
  // the matchup is that pair and the pick records the winning side's group.
  const selections = useMemo(
    () => resolveRoundSelections(groups, rounds),
    [groups, rounds],
  );
  const slotA = !isFinished ? selections[roundIndex]?.slots[0] : undefined;
  const slotB = !isFinished ? selections[roundIndex]?.slots[1] : undefined;
  const left = slotA?.items[0];
  const right = slotB?.items[0];

  function pick(winnerId: string) {
    if (!slotA || !slotB || !left || !right) return;
    const leftWon = winnerId === left.id;
    const winner = leftWon ? left : right;
    const loser = leftWon ? right : left;
    const winnerGroupId = leftWon ? slotA.groupId : slotB.groupId;
    setHistory((prev) => [
      ...prev,
      { winnerTitle: winner.title, loserTitle: loser.title },
    ]);
    // A SINGLE-POOL matchup (both contenders from one pool) can't be recorded as
    // "which group won" — both sides share a group id. Record it per item, with
    // `chosen` marking the winner, so results aggregate per item (see backend
    // play-results). A TWO-POOL matchup keeps the group-level pick.
    const singlePool = slotA.groupId === slotB.groupId;
    setAllPicks((prev) => [
      ...prev,
      ...(singlePool
        ? [
            {
              roundIndex,
              groupId: winnerGroupId,
              itemId: winner.id,
              chosen: true,
            },
            {
              roundIndex,
              groupId: winnerGroupId,
              itemId: loser.id,
              chosen: false,
            },
          ]
        : [{ roundIndex, groupId: winnerGroupId }]),
    ]);
    setRoundIndex((prev) => prev + 1);
  }

  // Fires once when the last matchup's pick is recorded — mirrors
  // RankPlayScreen's recordedRef guard. Anonymous plays ARE recorded (#221):
  // the endpoint takes an optional JWT and stores a null player. Still waits
  // for auth to resolve, so a signed-in player's run isn't attributed to nobody.
  //
  // Picks are stashed FIRST, not in .then(): this screen renders its "see
  // result" link in the same commit that fires this effect, with nothing
  // gating it on the request. Since #222 gates the result screen on these
  // picks, writing them after the round-trip means a player who clicks
  // promptly arrives at a LOCKED screen having just finished the pack.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || status === "loading" || recordedRef.current) return;
    recordedRef.current = true;
    writeLastPlayPicks(pack.id, allPicks);
    playsClient.record(pack.id, { picks: allPicks }).catch(() => undefined);
  }, [isFinished, pack.id, allPicks, status]);

  if (status === "loading") return null;

  const progressPct = isFinished
    ? 100
    : Math.round((roundIndex / Math.max(totalRounds, 1)) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <Text variant="tertiary" className="text-xs uppercase tracking-wide">
            {isFinished
              ? t("complete")
              : t("roundOf", { current: roundIndex + 1, total: totalRounds })}
          </Text>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-acc transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {left && right && (
        <>
          <section className="mb-6 text-center">
            <Text as="h2" variant="title" className="mb-2 text-3xl">
              {t("whichPrefer")}
            </Text>
          </section>
          <div className="mb-10">
            <HeadToHeadRound left={left} right={right} onPick={pick} />
          </div>
        </>
      )}

      {isFinished && (
        <section className="mb-10 text-center">
          <Text as="h2" variant="title" className="mb-2 text-3xl">
            {t("allMatchupsDone")}
          </Text>
          <Text variant="secondary" className="mb-6">
            {t("h2hSummary", { count: history.length })}
          </Text>
          <div className="mb-8 flex flex-col gap-2 text-start">
            {history.map((entry, index) => (
              <div
                key={index}
                role="group"
                aria-label={t("beat", {
                  winner: entry.winnerTitle,
                  loser: entry.loserTitle,
                })}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <Text className="font-semibold">{entry.winnerTitle}</Text>
                <Text variant="tertiary" className="text-xs" aria-hidden="true">
                  →
                </Text>
                <Text variant="tertiary" className="text-sm line-through">
                  {entry.loserTitle}
                </Text>
              </div>
            ))}
          </div>
          <Link
            href={`/packs/${pack.id}/result`}
            // Replace so Back from the result screen returns to the pack page,
            // not into the finished play session.
            replace
            className={buttonClassName("primary", "w-fit")}
          >
            {t("seeResult")}
          </Link>
        </section>
      )}
    </div>
  );
}
