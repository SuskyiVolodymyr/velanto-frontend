"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { resolveRoundSelections } from "@/src/features/play/round-sampling";
import { HeadToHeadRound } from "@/src/features/play/HeadToHeadRound";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function HeadToHeadPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const t = useTranslations("play");
  const router = useRouter();
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);
  // The contender chosen but NOT yet committed. Cleared on every advance, so a
  // new matchup always starts unselected and the confirm button can't re-fire
  // the previous round's pick.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recordSettled, setRecordSettled] = useState(false);

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

  function confirmPick() {
    if (!selectedId || !slotA || !slotB || !left || !right) return;
    const leftWon = selectedId === left.id;
    const winner = leftWon ? left : right;
    const loser = leftWon ? right : left;
    const winnerGroupId = leftWon ? slotA.groupId : slotB.groupId;
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
    setSelectedId(null);
    setRoundIndex((prev) => prev + 1);
  }

  // Fires once when the last matchup's pick is recorded. Anonymous plays ARE
  // recorded (#221): the endpoint takes an optional JWT and stores a null
  // player. Still waits for auth to resolve, so a signed-in player's run isn't
  // attributed to nobody.
  //
  // Picks are stashed FIRST, not in .then(): #222 gates the result screen on
  // them, so writing them after the round-trip risks landing the player on a
  // LOCKED result having just finished the pack.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || status === "loading" || recordedRef.current) return;
    recordedRef.current = true;
    writeLastPlayPicks(pack.id, allPicks);
    playsClient
      .record(pack.id, { picks: allPicks })
      .catch(() => undefined)
      .finally(() => setRecordSettled(true));
  }, [isFinished, pack.id, allPicks, status]);

  // Straight to the result once the play is recorded — no interstitial recap.
  // Waits for the record to SETTLE (not resolve) so the aggregate normally
  // includes this run, while a failed request still lets the player through.
  useEffect(() => {
    if (recordSettled) router.replace(`/packs/${pack.id}/result`);
  }, [recordSettled, router, pack.id]);

  if (status === "loading") return null;

  const progressPct = isFinished
    ? 100
    : Math.round((roundIndex / Math.max(totalRounds, 1)) * 100);

  return (
    <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
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
          <div className="mb-8">
            <HeadToHeadRound
              left={left}
              right={right}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          {/* Same placement and copy as the elimination formats' confirm. */}
          <div className="mb-10 flex justify-end">
            <Button disabled={!selectedId} onClick={confirmPick}>
              {roundIndex === totalRounds - 1
                ? t("finishRound")
                : t("nextRound")}
            </Button>
          </div>
        </>
      )}

      {isFinished && <LoadingState label={t("loadingResult")} />}
    </div>
  );
}
