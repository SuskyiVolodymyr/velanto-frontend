"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
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
import { PlayConfirmBar } from "@/src/features/play/PlayConfirmBar";
import { ResumePlayModal } from "@/src/features/play/ResumePlayModal";
import { roundHeading } from "@/src/shared/lib/round-heading";
import { toneFor, HAIRLINE_OVERLAY_STYLE } from "@/src/features/play/candidate-tone";
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
    if (restoredRef.current || !resume.ready || resume.needsChoice) return;
    restoredRef.current = true;
    if (resume.initialRoundIndex > 0 && Array.isArray(resume.initialChoices)) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setRoundIndex(resume.initialRoundIndex);
      setAllPicks(resume.initialChoices as RecordedPick[]);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [
    resume.ready,
    resume.needsChoice,
    resume.initialRoundIndex,
    resume.initialChoices,
  ]);
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
  // "Round done but not the whole play" (the interstitial state where the
  // left status panel shows "ROUND RANKED" and the right column shows the
  // finished RankedList, T7) has no variable of its own below: every use site
  // already has `!isFinished` in scope, and `roundDone` alone is exactly that
  // condition there.
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
  // its own palette family — the shared `toneFor` helper (see
  // candidate-tone.ts), also used by CandidateCard/VersusRound/HeadToHeadRound.
  function toneForDrawIndex(drawIndex: number): string {
    return toneFor(pack.coverTone, drawIndex);
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

  return (
    <>
      {/* No counter in the bar: the round header's eyebrow below is
          `play.roundOf`, and the mock only ever draws it there. */}
      <PlayChrome
        pack={pack}
        isFinished={isFinished}
        roundIndex={roundIndex}
        totalRounds={totalRounds}
        showRoundCounter={false}
      />

      <ResumePlayModal
        open={resume.needsChoice}
        onContinue={resume.chooseContinue}
        onRestart={resume.chooseRestart}
        roundsDone={resume.initialRoundIndex}
      />

      <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
        {slot && !isFinished && (
          <>
            <div className="mb-6">
              {/* Mirrors PlayScreen/HeadToHeadPlayScreen's header contract —
                  the one the mock actually draws for every format, including
                  rank_blind: "Round N of M" eyebrow, the round's own name (the
                  pool name is the fallback, same convention as elimination
                  rounds), and the in-round placement count as the prompt
                  underneath, left-aligned with the progress rail pinned right. */}
              <PlayRoundHeader
                eyebrow={t("roundOf", {
                  current: roundIndex + 1,
                  total: totalRounds,
                })}
                title={rounds[roundIndex]?.name?.trim() || groupName}
                instruction={
                  roundDone
                    ? t("rankAllPlacedPrompt")
                    : t("rankPlaceItemPrompt", {
                        current: placedCount + 1,
                        total: slotCount,
                      })
                }
                align="start"
                roundIndex={roundIndex}
                totalRounds={totalRounds}
              />
            </div>

            {/* T7: a persistent two-column grid for the whole round — the
                left status panel flips in place between the "place this
                one" (pending) and "round ranked" (done) copy, while the
                right column stays a vertical list of numbered rows: the
                interactive slot rows while pending, the same RankedList the
                result screen shows once the round is done. */}
            {/* 900px, not Tailwind's lg (1024px) — the mock's own
                [data-el="rankcols"] breakpoint. */}
            <div
              data-testid="rank-columns"
              className="mb-6 grid grid-cols-1 items-start gap-[16px] min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            >
              <div
                data-testid="rank-status-panel"
                className={cn(
                  "flex flex-col gap-[12px] rounded-[20px] border bg-surface-card p-[18px]",
                  roundDone ? "border-success/30" : "border-acc/30",
                )}
              >
                {!roundDone ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-acc-hover">
                      {t("rankPendingEyebrow")}
                    </p>
                    {/* Full-width 16:9, matching the mock — not a fixed-width
                        floating box, and no idle-bob motion: a real video
                        drifting under the pointer makes its own controls hard
                        to hit. ImageCard/YouTubeCard already carry their own
                        aspect-video box (own data-testid too); only the text
                        fallback needs one built here. */}
                    {currentImageSrc ? (
                      <ImageCard
                        src={currentImageSrc}
                        alt={currentItem?.title ?? ""}
                        className="rounded-[13px]"
                      />
                    ) : currentVideoId ? (
                      <YouTubeCard
                        videoId={currentVideoId}
                        startSeconds={currentStartSeconds}
                        className="rounded-[13px]"
                      />
                    ) : (
                      <div
                        data-testid="rank-current-media"
                        className="relative aspect-video overflow-hidden rounded-[13px]"
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
                    <p className="text-[18px] font-bold tracking-[-0.015em] text-foreground">
                      {currentItem?.title}
                    </p>
                    <p className="text-[12.5px] leading-[1.5] text-foreground/50 text-pretty">
                      {t("rankPendingFlavor")}
                    </p>
                    <Text
                      variant="tertiary"
                      className="mt-auto border-t border-border pt-[11px] text-[12px]"
                    >
                      {t("rankRemainingNote", {
                        count: Math.max(slotCount - placedCount - 1, 0),
                      })}
                    </Text>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7EE7B4]">
                      {t("roundComplete")}
                    </p>
                    <p className="text-[18px] font-bold tracking-[-0.015em] text-foreground">
                      {t("ranked", { name: groupName })}
                    </p>
                    <p className="text-[12.5px] leading-[1.5] text-foreground/50 text-pretty">
                      {t("rankDoneFlavor")}
                    </p>
                    <Text
                      variant="tertiary"
                      className="mt-auto border-t border-border pt-[11px] text-[12px]"
                    >
                      {t("rankDoneFooter", { count: slotCount })}
                    </Text>
                  </>
                )}
              </div>

              <div>
                {!roundDone ? (
                  <div className="flex flex-col gap-[8px]">
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
                            "flex w-full items-center gap-3 rounded-tile border p-[11px_13px] text-start transition-colors",
                            filled
                              ? "border-border bg-surface-card"
                              : "border-dashed border-acc/40 hover:bg-acc/[0.08]",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] font-mono text-[13px] font-bold tabular-nums",
                              filled
                                ? "bg-white/[0.06] text-foreground/55"
                                : "bg-acc/[0.12] text-acc-hover",
                            )}
                          >
                            #{slotIndex + 1}
                          </span>
                          {filled ? (
                            <Text className="line-clamp-1 flex-1 text-sm font-[650]">
                              {filled.title}
                            </Text>
                          ) : (
                            <p className="line-clamp-1 flex-1 text-[14px] font-semibold text-foreground/50">
                              {t("rankPlaceItemHere", {
                                name: currentItem?.title ?? "",
                              })}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // The same list the result screen shows, so the recap and
                  // the result a player ends up with read as one thing.
                  <RankedList rows={rankedRows} />
                )}
              </div>
            </div>

            {roundDone && (
              <PlayConfirmBar
                ready
                disabled={false}
                onConfirm={goToNextRound}
                confirmLabel={t("nextRound")}
                title={t("nextUp", {
                  name: roundHeading(pack, roundIndex + 1),
                })}
              />
            )}
          </>
        )}

        {isFinished && <LoadingState label={t("loadingResult")} />}
      </div>
    </>
  );
}
