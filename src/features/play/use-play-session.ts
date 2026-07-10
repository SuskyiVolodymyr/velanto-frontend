"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import {
  resolveRoundCandidates,
  resolveVersusRoundCandidates,
} from "@/src/features/play/round-sampling";
import type { Category, Item, Pack } from "@/src/shared/types/pack";

export interface Pick {
  groupId: string;
  itemId: string;
  itemTitle: string;
}

export interface PlaySession {
  isVersus: boolean;
  roundIndex: number;
  totalRounds: number;
  isFinished: boolean;
  progressPct: number;
  showRound: boolean;
  roundTitle: string;
  totalCount: number;
  revealedCount: number;
  canRevealMore: boolean;
  canConfirm: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  picks: Pick[];
  confirmPick: () => void;
  revealNext: () => void;
  revealAll: () => void;
  // Groups format: the sampled candidates for the current round.
  candidates: Item[];
  // Versus (nxn) format: the two fixed categories and their per-round samples.
  categoryA?: Category;
  categoryB?: Category;
  versusCandidatesA: Item[];
  versusCandidatesB: Item[];
}

/**
 * Owns the save_one/sacrifice_one/nxn play state machine: the round cursor,
 * per-round reveal/selection, the unified round model that abstracts over the
 * versus (nxn) and groups formats, and the idempotent record-on-finish effect.
 * Returns a flat interface so PlayScreen can stay a thin presentational shell.
 */
export function usePlaySession(pack: Pack): PlaySession {
  const isVersus = pack.format === "nxn";
  const groups = pack.groups ?? [];
  const categories = pack.categories ?? [];
  const versusN = pack.versusN ?? 0;
  const [categoryA, categoryB] = categories;
  const totalRounds = isVersus ? (pack.versusRounds ?? 0) : groups.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);

  const isFinished = roundIndex >= totalRounds;
  const group = !isVersus && !isFinished ? groups[roundIndex] : null;

  // Re-sampled only when the round changes, not on every render.
  const candidates = useMemo(
    () => (group ? resolveRoundCandidates(group) : []),
    [group],
  );
  // categoryA/categoryB are the same 2 categories for the whole play session
  // (unlike `group`, which changes reference every round) — roundIndex is
  // the only thing that actually changes when a new round starts, so it
  // must stay in the deps to force a fresh sample each round even though
  // the callback itself never reads it.
  const versusCandidatesA = useMemo(
    () =>
      isVersus && !isFinished && categoryA
        ? resolveVersusRoundCandidates(categoryA, versusN)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isVersus, isFinished, categoryA, versusN, roundIndex],
  );
  const versusCandidatesB = useMemo(
    () =>
      isVersus && !isFinished && categoryB
        ? resolveVersusRoundCandidates(categoryB, versusN)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isVersus, isFinished, categoryB, versusN, roundIndex],
  );

  // A single per-round model unifies the two formats so the rest of the
  // component reads one shape instead of branching on `isVersus` at every
  // site. `title` and `totalCount` drive the UI; `resolvePick` turns the
  // current `selectedId` into the Pick to record (or null if invalid).
  //
  // totalCount is derived from the actual sampled candidates, not the
  // pack-level versusN directly — a malformed pack with fewer items than
  // versusN in a category would otherwise make "Showing X of Y" over-report
  // and leave "Show next" stuck past the last real card. Backend create-flow
  // validation guarantees this can't happen today, but TS can't express it.
  const round = isVersus
    ? {
        title: `Round ${roundIndex + 1}`,
        totalCount: Math.min(
          versusCandidatesA.length,
          versusCandidatesB.length,
        ),
        resolvePick(id: string): Pick | null {
          const category = categories.find((c) => c.id === id);
          if (!category) return null;
          return {
            groupId: String(roundIndex),
            itemId: category.id,
            itemTitle: category.name,
          };
        },
      }
    : {
        title: group?.name ?? "",
        totalCount: candidates.length,
        resolvePick(id: string): Pick | null {
          if (!group) return null;
          const item = candidates.find((candidate) => candidate.id === id);
          if (!item) return null;
          return { groupId: group.id, itemId: item.id, itemTitle: item.title };
        },
      };

  const totalCount = round.totalCount;
  const revealedCount = Math.min(revealed, totalCount);
  const canRevealMore = revealedCount < totalCount;
  const canConfirm = selectedId !== null && revealedCount >= totalCount;

  function confirmPick() {
    if (!canConfirm || selectedId === null) return;
    const pick = round.resolvePick(selectedId);
    if (!pick) return;
    setPicks((prev) => [...prev, pick]);
    setRoundIndex((prev) => prev + 1);
    setSelectedId(null);
    setRevealed(1);
  }

  function revealNext() {
    setRevealed((prev) => Math.min(prev + 1, totalCount));
  }

  function revealAll() {
    setRevealed(totalCount);
  }

  // Fires once when the last round is confirmed: records the play, then
  // stashes the picks for the result page — only once we know the server
  // actually counted them, so "your pick" never shows a percentage that
  // didn't include your own vote (e.g. after a failed request).
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || recordedRef.current) return;
    recordedRef.current = true;
    const recordedPicks = picks.map(({ groupId, itemId }) => ({
      groupId,
      itemId,
    }));
    playsClient
      .record(pack.id, { picks: recordedPicks })
      .then(() => writeLastPlayPicks(pack.id, recordedPicks))
      .catch(() => undefined);
  }, [isFinished, pack.id, picks]);

  const progressPct = isFinished
    ? 100
    : Math.round((roundIndex / totalRounds) * 100);
  const showRound = isVersus
    ? Boolean(!isFinished && categoryA && categoryB)
    : Boolean(group);

  return {
    isVersus,
    roundIndex,
    totalRounds,
    isFinished,
    progressPct,
    showRound,
    roundTitle: round.title,
    totalCount,
    revealedCount,
    canRevealMore,
    canConfirm,
    selectedId,
    setSelectedId,
    picks,
    confirmPick,
    revealNext,
    revealAll,
    candidates,
    categoryA,
    categoryB,
    versusCandidatesA,
    versusCandidatesB,
  };
}
