"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { cn } from "@/src/shared/lib/cn";
import { playsClient } from "@/src/shared/lib/plays-client";
import {
  writeLastPlayPicks,
  writeLastPlayId,
} from "@/src/shared/lib/last-play-storage";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { useRoundSelections } from "@/src/features/play/use-round-selections";
import { RankedList, type RankedRow } from "@/src/shared/components/RankedList";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import type { Pack, Item } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function RankPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const router = useRouter();
  const t = useTranslations("play");
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<number, Item>>({});
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);
  const [recordSettled, setRecordSettled] = useState(false);

  // Drawn items for every round, resolved once after mount (dedup spans
  // rounds). Null until the client has drawn; see useRoundSelections.
  const resolved = useRoundSelections(groups, rounds);
  const selections = resolved ?? [];
  const groupNameById = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups],
  );

  const slot =
    roundIndex < totalRounds ? selections[roundIndex]?.slots[0] : undefined;
  const candidates = slot?.items ?? [];
  const groupName = slot ? (groupNameById.get(slot.groupId) ?? "") : "";
  const slotCount = candidates.length;
  const placedCount = Object.keys(placements).length;
  const roundDone = slotCount > 0 && placedCount >= slotCount;
  const isLastRound = roundIndex >= totalRounds - 1;
  const isFinished = totalRounds > 0 && isLastRound && roundDone;
  const isRoundComplete = roundDone && !isFinished;
  const currentItem = !roundDone ? candidates[placedCount] : undefined;
  const currentVideoId =
    currentItem?.type === "youtube"
      ? extractYouTubeId(currentItem.value)
      : null;
  const currentStartSeconds =
    currentItem?.type === "youtube"
      ? extractYouTubeStart(currentItem.value)
      : null;
  const currentImageSrc =
    currentItem?.type === "image" ? mediaUrl(currentItem.value) : null;
  // The finished round in the shape the result screen renders it: slot order is
  // the ranking, and each row carries where the item came in the draw.
  const rankedRows: RankedRow[] = Array.from(
    { length: slotCount },
    (_, slotIndex) => placements[slotIndex],
  )
    .filter((item) => item !== undefined)
    .map((item) => ({
      id: item.id,
      title: item.title,
      drawIndex: candidates.findIndex((candidate) => candidate.id === item.id),
    }));

  function place(slotIndex: number) {
    if (!slot || placements[slotIndex] || placedCount >= slotCount) return;
    const item = candidates[placedCount];
    const nextPlacements = { ...placements, [slotIndex]: item };
    setPlacements(nextPlacements);
    if (Object.keys(nextPlacements).length >= slotCount) {
      const roundPicks: RecordedPick[] = Object.entries(nextPlacements).map(
        ([position, placedItem]) => ({
          roundIndex,
          groupId: slot.groupId,
          itemId: placedItem.id,
          position: Number(position),
          // Where the item came in the DRAW — items are shown in `candidates`
          // order, one at a time. Ranking blind means that order is what the
          // player was reacting to, and `position` can't carry it: these picks
          // are keyed by the slot each item landed in (#338).
          drawIndex: candidates.findIndex(
            (candidate) => candidate.id === placedItem.id,
          ),
        }),
      );
      setAllPicks((prev) => [...prev, ...roundPicks]);
    }
  }

  function goToNextRound() {
    setRoundIndex((prev) => prev + 1);
    setPlacements({});
  }

  // Fires once when the last round's last item is placed — mirrors
  // PlayScreen's recordedRef guard. Anonymous plays ARE recorded (#221): the
  // endpoint takes an optional JWT and stores a null player. Still waits for
  // auth to resolve, so a signed-in player's run isn't attributed to nobody.
  //
  // Picks are stashed FIRST, not in .then(): #222 gates the result screen on
  // them, so writing them after the round-trip would send a player who just
  // finished the pack to a LOCKED screen.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || status === "loading" || recordedRef.current) return;
    recordedRef.current = true;
    writeLastPlayPicks(pack.id, allPicks);
    playsClient
      .record(pack.id, { picks: allPicks })
      // Stash the play id so the result screen can build a short `?play=` share
      // link. Best-effort: without it the share falls back to encoding every
      // pick into `?p=`, which for rank_blind is the longest payload of the
      // five formats — every drawn item, its placement and its draw index.
      .then(({ id }) => {
        if (id) writeLastPlayId(pack.id, id);
      })
      .catch(() => undefined)
      // Settled, not succeeded: a failed record must not strand the player on
      // a finished play screen. The picks above are already stashed, so the
      // result screen opens either way.
      .finally(() => setRecordSettled(true));
  }, [isFinished, pack.id, allPicks, status]);

  // Once the record has settled, go straight to the result — no interstitial
  // "all rounds done" step, same as the other four formats.
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

      {slot && !roundDone && (
        <>
          <section className="mb-6 text-center">
            <Text as="h2" variant="title" className="mb-2 text-3xl">
              {groupName}
            </Text>
            <Text variant="secondary">
              {t("rankInstruction", {
                current: placedCount + 1,
                total: slotCount,
              })}
            </Text>
          </section>

          <div className="mb-8 flex justify-center">
            {currentImageSrc ? (
              <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-acc bg-surface">
                <ImageCard
                  src={currentImageSrc}
                  alt={currentItem?.title ?? ""}
                />
                <Text className="line-clamp-2 p-4 text-center font-semibold">
                  {currentItem?.title}
                </Text>
              </div>
            ) : currentVideoId ? (
              <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-acc bg-surface">
                <YouTubeCard
                  videoId={currentVideoId}
                  startSeconds={currentStartSeconds}
                />
                <Text className="line-clamp-2 p-4 text-center font-semibold">
                  {currentItem?.title}
                </Text>
              </div>
            ) : (
              <div className="flex h-[100px] w-[230px] items-center justify-center rounded-2xl border border-acc bg-surface p-4 text-center">
                <Text className="line-clamp-2 font-semibold">
                  {currentItem?.title}
                </Text>
              </div>
            )}
          </div>

          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: slotCount }, (_, slotIndex) => {
              const filled = placements[slotIndex];
              return (
                <button
                  key={slotIndex}
                  type="button"
                  disabled={Boolean(filled)}
                  onClick={() => place(slotIndex)}
                  aria-label={
                    filled
                      ? t("rankSlotFilled", {
                          rank: slotIndex + 1,
                          title: filled.title,
                        })
                      : t("rankSlotEmpty", { rank: slotIndex + 1 })
                  }
                  className={cn(
                    "flex h-[100px] flex-col justify-between rounded-2xl border p-3 text-start transition-colors",
                    filled
                      ? "border-border bg-surface"
                      : "border-dashed border-border-strong bg-white/[0.02] hover:border-acc/40",
                  )}
                >
                  <Text variant="tertiary" className="text-xs font-semibold">
                    #{slotIndex + 1}
                  </Text>
                  <Text
                    className={cn(
                      "line-clamp-2 text-sm font-semibold",
                      !filled && "text-foreground-tertiary",
                    )}
                  >
                    {filled ? filled.title : t("placeHere")}
                  </Text>
                </button>
              );
            })}
          </div>
        </>
      )}

      {isRoundComplete && slot && (
        <section className="mb-10 text-center">
          <Text as="h2" variant="title" className="mb-2 text-3xl">
            {t("ranked", { name: groupName })}
          </Text>
          {/* The same list the result screen shows, so the recap and the
              result a player ends up with read as one thing. */}
          <div className="mb-8 text-start">
            <RankedList rows={rankedRows} />
          </div>
          <Button onClick={goToNextRound} className="w-full">
            {t("nextRound")}
          </Button>
        </section>
      )}

      {isFinished && <LoadingState label={t("loadingResult")} />}
    </div>
  );
}
