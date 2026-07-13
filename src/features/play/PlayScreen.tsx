"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import { VersusRound } from "@/src/features/play/VersusRound";
import { usePlaySession } from "@/src/features/play/use-play-session";
import {
  INSTRUCTION_KEY,
  PICKED_LABEL_KEY,
} from "@/src/features/play/play-format-copy";
import { PlayProgress } from "@/src/features/play/PlayProgress";
import { CandidateCard } from "@/src/features/play/CandidateCard";
import { PicksSummary } from "@/src/features/play/PicksSummary";
import { LoadingState } from "@/src/shared/components/LoadingState";

// How many columns a groups-format round lays its candidates out in, chosen by
// candidate count so they fill the row instead of leaving fixed-width gaps: up
// to 4 sit in one row; more split across two balanced rows (6→3, 8→4). Drops to
// two columns below `lg` so cards stay legible on narrow viewports. Keys are the
// resolved column target (1–6); values are literal classes so Tailwind emits them.
const CANDIDATE_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-2 lg:grid-cols-6",
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
    <div className="mx-auto w-full max-w-5xl flex-1 px-7 py-10">
      <PlayProgress
        isFinished={session.isFinished}
        roundIndex={session.roundIndex}
        totalRounds={session.totalRounds}
        progressPct={session.progressPct}
      />

      {session.showRound && (
        <>
          <section className="mb-6">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              {session.roundTitle}
            </Text>
            <Text variant="secondary">{t(INSTRUCTION_KEY[pack.format])}</Text>
          </section>

          {session.isVersus ? (
            <div className="mb-8">
              <VersusRound
                sideA={{
                  id: session.sideA!.id,
                  name: session.sideA!.name,
                  items: session.versusCandidatesA,
                }}
                sideB={{
                  id: session.sideB!.id,
                  name: session.sideB!.name,
                  items: session.versusCandidatesB,
                }}
                selectedId={session.selectedId}
                onSelect={session.setSelectedId}
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
                />
              ))}
            </div>
          )}

          <div className="mb-10 flex justify-end">
            <Button
              disabled={!session.canConfirm}
              onClick={session.confirmPick}
            >
              {session.isLastRound ? t("finishRound") : t("nextRound")}
            </Button>
          </div>
        </>
      )}

      {session.isFinished && <LoadingState label={t("loadingResult")} />}

      {session.picks.length > 0 && (
        <PicksSummary
          label={t(PICKED_LABEL_KEY[pack.format])}
          picks={session.picks}
        />
      )}
    </div>
  );
}
