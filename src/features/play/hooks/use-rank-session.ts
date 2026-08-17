"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import type { Item, Pack } from "@/types/pack";
import type { RankedRow } from "@/ui/RankedList";
import { playsClient } from "@/api/plays-client";
import { extractYouTubeId, extractYouTubeStart } from "@/utils/youtube";
import { mediaUrl } from "@/utils/media-url";
import { writeLastPlayPicks, writeLastPlayId } from "@/utils/last-play-storage";
import { usePlayResume } from "@/features/play/hooks/use-play-resume";
import { useRoundSelections } from "@/features/play/hooks/use-round-selections";
import type { RecordedPick } from "@/types/play-results";

/**
 * The rank_blind play session: the round cursor, the per-round placements, the
 * accumulated picks, resume, and the record-then-redirect at the end.
 *
 * Split out of RankPlayScreen so that file is the screen and this is the game —
 * the same division PlayScreen already has with usePlaySession.
 */
export function useRankSession(pack: Pack) {
  const { status } = useAuth();
  const router = useRouter();
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
  // finished RankedList, T7) has no variable of its own: every use site
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

  return {
    status,
    resume,
    rounds,
    roundIndex,
    totalRounds,
    slot,
    candidates,
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
  };
}
