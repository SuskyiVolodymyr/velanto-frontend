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
import { usePlayResume } from "@/src/features/play/use-play-resume";
import { RankedList, type RankedRow } from "@/src/shared/components/RankedList";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { PlayChrome } from "@/src/features/play/PlayChrome";
import { PlayRoundHeader } from "@/src/features/play/PlayRoundHeader";
import { roundHeading } from "@/src/shared/lib/round-heading";
import { COVER_TONES } from "@/src/shared/types/pack";
import type { Pack, Item } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

// Diagonal hairline overlay for a text item's gradient tile — same recipe as
// the elimination round's media band (see CandidateCard.tsx / docs/superpowers/
// plans/2026-07-28-solo-play-results-redesign.md T4/T7), matched independently
// here since the two tasks land concurrently on different files.
const HAIRLINE_OVERLAY_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(122deg, rgba(255,255,255,.03) 0 1px, transparent 1px 15px)",
};

export function RankPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const router = useRouter();
  const t = useTranslations("play");
  const tFormat = useTranslations("formats");
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<number, Item>>({});
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);
  const [recordSettled, setRecordSettled] = useState(false);

  // Resume: a seeded draw so a reload replays the same items, plus restore of
  // the round cursor and picks so far. Read from storage after mount, so `seed`
  // starts null and the draw waits for it.
  const resume = usePlayResume(pack);
  // Destructured so the completion effect can depend on the stable
  // `clearProgress` directly, not the freshly-built `resume` object each render.
  const { saveProgress, clearProgress } = resume;

  // Drawn items for every round, resolved once after mount (dedup spans
  // rounds). Null until the client has drawn; see useRoundSelections.
  const resolved = useRoundSelections(groups, rounds, resume.seed);
  const selections = resolved ?? [];

  // Restore a saved play ONCE, after the resume read settles — placements reset
  // to empty so the resumed round is ranked fresh (a record is only ever saved
  // between rounds, never mid-round). initialChoices is the accumulated picks.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !resume.ready) return;
    restoredRef.current = true;
    if (resume.initialRoundIndex > 0 && Array.isArray(resume.initialChoices)) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setRoundIndex(resume.initialRoundIndex);
      setAllPicks(resume.initialChoices as RecordedPick[]);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [resume.ready, resume.initialRoundIndex, resume.initialChoices]);
  const groupNameById = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups],
  );

  const slot =
    roundIndex < totalRounds ? selections[roundIndex]?.slots[0] : undefined;
  const candidates = slot?.items ?? [];
  const groupName = slot?.groupId
    ? (groupNameById.get(slot.groupId) ?? "")
    : "";
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

  // A per-item accent tone, cycling COVER_TONES by the item's position in the
  // draw and seeded off the pack's own cover tone so a pack's tiles stay in
  // its own palette family. Derived independently of CandidateCard's version
  // (T4 lands concurrently on a different file) but the same recipe.
  const toneSeed = Math.max(
    COVER_TONES.indexOf(pack.coverTone as (typeof COVER_TONES)[number]),
    0,
  );
  function toneForDrawIndex(drawIndex: number): string {
    return COVER_TONES[(toneSeed + drawIndex) % COVER_TONES.length];
  }

  function place(slotIndex: number) {
    // `slot.groupId` is what the API keys a pick by; a random slot that found no
    // free pool has none, and also no items, so there is nothing to place.
    if (!slot?.groupId || placements[slotIndex] || placedCount >= slotCount)
      return;
    const item = candidates[placedCount];
    const nextPlacements = { ...placements, [slotIndex]: item };
    setPlacements(nextPlacements);
    if (Object.keys(nextPlacements).length >= slotCount) {
      const roundPicks: RecordedPick[] = Object.entries(nextPlacements).map(
        ([position, placedItem]) => ({
          roundIndex,
          groupId: slot.groupId!,
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
    const nextRoundIndex = roundIndex + 1;
    setRoundIndex(nextRoundIndex);
    setPlacements({});
    // Save progress on leaving a finished round — allPicks already holds this
    // round's placements (added in `place` when the round filled). The guard
    // mirrors the other two screens: the "Next round" button is already hidden
    // on the final round (isRoundComplete is false when isFinished), so this is
    // defence-in-depth against a completed play being saved as resumable.
    if (nextRoundIndex < totalRounds) {
      saveProgress(nextRoundIndex, allPicks);
    }
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
    // Completed — drop the resume record so the pack leaves "Continue playing".
    clearProgress();
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
  }, [isFinished, pack.id, allPicks, status, clearProgress]);

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
    <>
      <PlayChrome
        packId={pack.id}
        title={pack.title}
        isFinished={isFinished}
        roundIndex={roundIndex}
        totalRounds={totalRounds}
        progressPct={progressPct}
      />

      <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
        {slot && !roundDone && (
          <>
            <PlayRoundHeader
              eyebrow={`${tFormat("rank_blind")} · ${groupName}`}
              title={groupName}
              instruction={t("rankInstruction", {
                current: placedCount + 1,
                total: slotCount,
              })}
              align="center"
            />

            <div className="mb-8 mt-8 flex justify-center">
              <div className="w-[230px] overflow-hidden rounded-card border-[1.5px] border-acc bg-background ring-4 ring-acc/[0.16] animate-card-float">
                {currentImageSrc ? (
                  <ImageCard
                    src={currentImageSrc}
                    alt={currentItem?.title ?? ""}
                    className="h-[150px]"
                  />
                ) : currentVideoId ? (
                  <YouTubeCard
                    videoId={currentVideoId}
                    startSeconds={currentStartSeconds}
                    className="h-[150px]"
                  />
                ) : (
                  <div
                    className="relative h-[150px]"
                    style={{
                      background: `linear-gradient(158deg, ${toneForDrawIndex(placedCount)}, var(--background) 78%)`,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={HAIRLINE_OVERLAY_STYLE}
                    />
                  </div>
                )}
                <Text className="line-clamp-2 p-[14px] text-[16.5px] font-semibold">
                  {currentItem?.title}
                </Text>
              </div>
            </div>

            <div className="mb-10 grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              {Array.from({ length: slotCount }, (_, slotIndex) => {
                const filled = placements[slotIndex];
                const filledTone = filled
                  ? toneForDrawIndex(
                      candidates.findIndex(
                        (candidate) => candidate.id === filled.id,
                      ),
                    )
                  : undefined;
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
                    style={
                      filled
                        ? {
                            background: `linear-gradient(158deg, ${filledTone}, var(--background) 82%)`,
                          }
                        : undefined
                    }
                    className={cn(
                      "flex min-h-[110px] flex-col justify-between rounded-tile border-[1.5px] p-[14px] text-start transition-colors",
                      filled
                        ? "border-border"
                        : "border-dashed border-white/[0.14] bg-white/[0.02] hover:border-acc/40",
                    )}
                  >
                    {filled ? (
                      <span className="text-[11px] font-semibold tabular-nums text-white/75">
                        #{slotIndex + 1}
                      </span>
                    ) : (
                      <Text
                        variant="tertiary"
                        className="text-[11px] font-semibold tabular-nums"
                      >
                        #{slotIndex + 1}
                      </Text>
                    )}
                    {filled ? (
                      <Text className="line-clamp-2 text-sm font-semibold">
                        {filled.title}
                      </Text>
                    ) : (
                      <Text variant="tertiary" className="text-[12.5px]">
                        {t("placeHere")}
                      </Text>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {isRoundComplete && slot && (
          <section className="mb-10 flex flex-col items-center gap-6 text-center">
            <PlayRoundHeader
              eyebrow={t("roundComplete")}
              title={t("ranked", { name: groupName })}
              instruction={t("nextUp", {
                name: roundHeading(pack, roundIndex + 1),
              })}
              align="center"
            />
            {/* The same list the result screen shows, so the recap and the
                result a player ends up with read as one thing. */}
            <div className="w-full max-w-[420px] text-start">
              <RankedList rows={rankedRows} />
            </div>
            <Button onClick={goToNextRound} className="w-full max-w-[420px]">
              {t("nextRound")}
            </Button>
          </section>
        )}

        {isFinished && <LoadingState label={t("loadingResult")} />}
      </div>
    </>
  );
}
