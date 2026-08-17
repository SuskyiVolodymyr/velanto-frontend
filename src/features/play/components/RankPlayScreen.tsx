"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";
import { LoadingState } from "@/ui/LoadingState";
import { cn } from "@/utils/cn";
import { YouTubeCard } from "@/components/YouTubeCard";
import { ImageCard } from "@/ui/ImageCard";
import { RankedList } from "@/ui/RankedList";
import { pageContainer } from "@/constants/page-container";
import { PlayChrome } from "@/features/play/components/PlayChrome";
import { PlayRoundHeader } from "@/features/play/components/PlayRoundHeader";
import { PlayConfirmBar } from "@/features/play/components/PlayConfirmBar";
import { ResumePlayModal } from "@/features/play/components/ResumePlayModal";
import { roundHeading } from "@/utils/round-heading";
import {
  toneFor,
  HAIRLINE_OVERLAY_STYLE,
} from "@/features/play/candidate-tone";
import { useRankSession } from "@/features/play/hooks/use-rank-session";
import type { Pack } from "@/types/pack";

export function RankPlayScreen({ pack }: { pack: Pack }) {
  const t = useTranslations("play");
  const {
    status,
    resume,
    rounds,
    roundIndex,
    totalRounds,
    slot,
    groupName,
    placements,
    placedCount,
    slotCount,
    roundDone,
    isFinished,
    currentItem,
    currentVideoId,
    currentStartSeconds,
    currentImageSrc,
    rankedRows,
    place,
    goToNextRound,
  } = useRankSession(pack);

  // A per-item accent tone, cycling COVER_TONES by the item's position in the
  // draw and seeded off the pack's own cover tone so a pack's tiles stay in
  // its own palette family — the shared `toneFor` helper (see
  // candidate-tone.ts), also used by CandidateCard/VersusRound/HeadToHeadRound.
  function toneForDrawIndex(drawIndex: number): string {
    return toneFor(pack.coverTone, drawIndex);
  }

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

      <div className={cn(pageContainer(1120), "flex-1 py-10")}>
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
                            <Text className="min-w-0 flex-1 break-words text-sm font-[650]">
                              {filled.title}
                            </Text>
                          ) : (
                            <p className="min-w-0 flex-1 break-words text-[14px] font-semibold text-foreground/50">
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
