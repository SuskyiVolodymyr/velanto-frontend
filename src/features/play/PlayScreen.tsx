"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import { VersusRound } from "@/src/features/play/VersusRound";
import { usePlaySession } from "@/src/features/play/use-play-session";
import {
  INSTRUCTION_KEY,
  PICKED_LABEL_KEY,
} from "@/src/features/play/play-format-copy";
import { PlayChrome } from "@/src/features/play/PlayChrome";
import { PlayRoundHeader } from "@/src/features/play/PlayRoundHeader";
import { PlayConfirmBar } from "@/src/features/play/PlayConfirmBar";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { CandidateCard } from "@/src/features/play/CandidateCard";
import { PicksSummary } from "@/src/features/play/PicksSummary";
import { LoadingState } from "@/src/shared/components/LoadingState";

// How many columns a groups-format round lays its candidates out in, chosen by
// candidate count so they fill the row instead of leaving fixed-width gaps: up
// to 4 sit in one row; more split across two balanced rows (6→3, 8→4). Breakpoints
// match the mock (`Solo Play.dc.html`'s `[data-el="grid"]` media queries) exactly:
// 2 columns below 1000px, 1 column below 560px — not Tailwind's default `sm`/`lg`.
// Keys are the resolved column target (1–6); values are literal classes so
// Tailwind emits them.
const CANDIDATE_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 min-[560px]:grid-cols-2",
  3: "grid-cols-1 min-[560px]:grid-cols-2 min-[1000px]:grid-cols-3",
  4: "grid-cols-1 min-[560px]:grid-cols-2 min-[1000px]:grid-cols-4",
  5: "grid-cols-1 min-[560px]:grid-cols-2 min-[1000px]:grid-cols-5",
  6: "grid-cols-1 min-[560px]:grid-cols-2 min-[1000px]:grid-cols-6",
};

function candidateGridCols(count: number): string {
  const target =
    count <= 1 ? 1 : count <= 4 ? count : Math.min(6, Math.ceil(count / 2));
  return CANDIDATE_GRID_COLS[target];
}

export function PlayScreen({ pack }: { pack: Pack }) {
  const t = useTranslations("play");
  const router = useRouter();
  const session = usePlaySession(pack);

  // Once the finished play has been recorded (or the record failed), go straight
  // to the result page — no interstitial "all rounds done" step.
  useEffect(() => {
    if (session.recordSettled) {
      router.replace(`/packs/${pack.id}/result`);
    }
  }, [session.recordSettled, router, pack.id]);

  return (
    <>
      <PlayChrome
        pack={pack}
        isFinished={session.isFinished}
        roundIndex={session.roundIndex}
        totalRounds={session.totalRounds}
      />

      <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
        {session.showRound && (
          <>
            <div className="mb-6">
              <PlayRoundHeader
                eyebrow={t("roundOf", {
                  current: session.roundIndex + 1,
                  total: session.totalRounds,
                })}
                title={session.roundTitle}
                instruction={t(INSTRUCTION_KEY[pack.format])}
                align="start"
                roundIndex={session.roundIndex}
                totalRounds={session.totalRounds}
              />
            </div>

            {session.isVersus ? (
              <div className="mb-8">
                <VersusRound
                  sideA={{
                    // A single-pool round's two sides share a pool name, so label
                    // them generically ("Side A"/"Side B") instead.
                    name: session.versusSinglePool
                      ? t("versusSideA")
                      : session.sideA!.name,
                    items: session.versusCandidatesA,
                  }}
                  sideB={{
                    name: session.versusSinglePool
                      ? t("versusSideB")
                      : session.sideB!.name,
                    items: session.versusCandidatesB,
                  }}
                  selectedSide={
                    session.selectedId === null
                      ? null
                      : Number(session.selectedId)
                  }
                  onSelect={(side) => session.setSelectedId(String(side))}
                  packCoverTone={pack.coverTone}
                />
              </div>
            ) : (
              <div
                data-testid="candidate-grid"
                className={cn(
                  "mb-8 grid gap-4",
                  candidateGridCols(session.candidates.length),
                )}
              >
                {session.candidates.map((item, index) => (
                  <CandidateCard
                    key={item.id}
                    item={item}
                    index={index}
                    selected={item.id === session.selectedId}
                    onSelect={() => session.setSelectedId(item.id)}
                    packCoverTone={pack.coverTone}
                    format={pack.format}
                  />
                ))}
              </div>
            )}

            <PlayConfirmBar
              ready={session.canConfirm}
              disabled={!session.canConfirm}
              onConfirm={session.confirmPick}
              confirmLabel={session.isLastRound ? t("finishRound") : t("nextRound")}
            />
          </>
        )}

        {session.isFinished && <LoadingState label={t("loadingResult")} />}

        {session.displayPicks.length > 0 && (
          <PicksSummary
            label={t(PICKED_LABEL_KEY[pack.format])}
            picks={session.displayPicks}
            totalRounds={session.totalRounds}
          />
        )}
      </div>
    </>
  );
}
