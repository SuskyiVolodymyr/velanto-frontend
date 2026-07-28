"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Button } from "@/src/shared/components/Button";
import { playsClient } from "@/src/shared/lib/plays-client";
import {
  writeLastPlayId,
  writeLastPlayPicks,
} from "@/src/shared/lib/last-play-storage";
import { useRoundSelections } from "@/src/features/play/use-round-selections";
import { usePlayResume } from "@/src/features/play/use-play-resume";
import { HeadToHeadRound } from "@/src/features/play/HeadToHeadRound";
import { PlayChrome } from "@/src/features/play/PlayChrome";
import { PlayRoundHeader } from "@/src/features/play/PlayRoundHeader";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function HeadToHeadPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const t = useTranslations("play");
  const tFormat = useTranslations("formats");
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

  // Resume: seeded draw so a reload replays the same matchups, plus restore of
  // the round cursor and picks. Read from storage after mount → `seed` is null
  // until then, and the draw waits for it.
  const resume = usePlayResume(pack);
  // Destructured so the completion effect can depend on the stable
  // `clearProgress` directly, not the freshly-built `resume` object each render.
  const { saveProgress, clearProgress } = resume;

  const isFinished = totalRounds > 0 && roundIndex >= totalRounds;
  // Drawn items for every round, resolved once at mount (dedup spans rounds).
  // A 1v1 round has two slots (the two sides); each draws exactly one item, so
  // the matchup is that pair and the pick records the winning side's group.
  const resolved = useRoundSelections(groups, rounds, resume.seed);
  const selections = resolved ?? [];

  // Restore a saved play ONCE, after the resume read settles. selectedId stays
  // null so the resumed matchup opens unselected; initialChoices is allPicks.
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
  const slotA = !isFinished ? selections[roundIndex]?.slots[0] : undefined;
  const slotB = !isFinished ? selections[roundIndex]?.slots[1] : undefined;
  const left = slotA?.items[0];
  const right = slotB?.items[0];

  function confirmPick() {
    if (!selectedId || !slotA || !slotB || !left || !right) return;
    // A pool only exists once resolved; a random slot that found none leaves it
    // undefined, and the API counts a side by that id. Unreachable in practice
    // — create-time validation guarantees a free pool — but a pick with no
    // group is rejected, which silently loses the whole play.
    const groupIdA = slotA.groupId;
    const groupIdB = slotB.groupId;
    if (!groupIdA || !groupIdB) return;
    const leftWon = selectedId === left.id;
    // BOTH contenders, each under the pool it was drawn from, with `chosen` on
    // the winner. A two-pool matchup used to record just the winning pool
    // (velanto-frontend#333), which named the side but not the pairing — so
    // per-matchup results were impossible, and still are for plays recorded
    // that way. Single-pool always recorded per item; this is now the one
    // shape, and it is what the backend counts a side by.
    const nextAllPicks: RecordedPick[] = [
      ...allPicks,
      {
        roundIndex,
        groupId: groupIdA,
        itemId: left.id,
        chosen: leftWon,
      },
      {
        roundIndex,
        groupId: groupIdB,
        itemId: right.id,
        chosen: !leftWon,
      },
    ];
    const nextRoundIndex = roundIndex + 1;
    setAllPicks(nextAllPicks);
    setSelectedId(null);
    setRoundIndex(nextRoundIndex);
    // Save progress after each finished matchup so a reload resumes here; the
    // final matchup writes nothing — the completion effect clears the record.
    if (nextRoundIndex < totalRounds) {
      saveProgress(nextRoundIndex, nextAllPicks);
    }
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
    // Completed — drop the resume record so the pack leaves "Continue playing".
    clearProgress();
    writeLastPlayPicks(pack.id, allPicks);
    playsClient
      .record(pack.id, { picks: allPicks })
      // Stash the play id so the result screen can build a short `?play=` share
      // link instead of encoding every pick into `?p=`. Best-effort: a failed
      // record just falls back to the payload form.
      .then(({ id }) => {
        if (id) writeLastPlayId(pack.id, id);
      })
      .catch(() => undefined)
      .finally(() => setRecordSettled(true));
  }, [isFinished, pack.id, allPicks, status, clearProgress]);

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
        {left && right && (
          <>
            <div className="mb-8">
              <PlayRoundHeader
                eyebrow={tFormat("1v1")}
                title={t("whichPrefer")}
              />
            </div>
            <div className="mb-8">
              <HeadToHeadRound
                left={left}
                right={right}
                selectedId={selectedId}
                onSelect={setSelectedId}
                coverTone={pack.coverTone}
              />
            </div>
            {/* Same placement and copy as the elimination formats' confirm. */}
            <div className="mb-10 flex justify-end">
              <Button
                disabled={!selectedId}
                onClick={confirmPick}
                className="h-[52px] rounded-tile px-[30px] text-[15.5px] font-semibold"
              >
                {roundIndex === totalRounds - 1
                  ? t("finishRound")
                  : t("nextRound")}
              </Button>
            </div>
          </>
        )}

        {isFinished && <LoadingState label={t("loadingResult")} />}
      </div>
    </>
  );
}
