"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { resolveRoundSelections } from "@/src/features/play/round-sampling";
import type { Item, Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export interface Pick {
  roundIndex: number;
  groupId: string;
  // Absent for versus picks (a side is chosen, not an item).
  itemId?: string;
  // Display label: the item title, or the side name for versus picks.
  itemTitle: string;
}

// A versus side is a pool held constant across every round of the play.
export interface VersusSide {
  id: string;
  name: string;
}

export interface PlaySession {
  isVersus: boolean;
  roundIndex: number;
  totalRounds: number;
  isFinished: boolean;
  progressPct: number;
  showRound: boolean;
  roundTitle: string;
  canConfirm: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  picks: Pick[];
  confirmPick: () => void;
  // Groups format: the drawn candidates for the current round's single slot.
  candidates: Item[];
  // Versus (nxn) format: the two fixed sides and their per-round drawn items.
  sideA?: VersusSide;
  sideB?: VersusSide;
  versusCandidatesA: Item[];
  versusCandidatesB: Item[];
}

function toRecordedPick(pick: Pick): RecordedPick {
  return {
    roundIndex: pick.roundIndex,
    groupId: pick.groupId,
    ...(pick.itemId !== undefined ? { itemId: pick.itemId } : {}),
  };
}

/**
 * Owns the save_one/sacrifice_one/nxn play state machine over the pools-and-
 * rounds model: it draws the whole session's items once (dedup spans rounds),
 * tracks the round cursor and per-round selection, unifies the versus (nxn) and
 * groups formats behind one shape, and records the play once on finish. Returns
 * a flat interface so PlayScreen can stay a thin presentational shell.
 */
export function usePlaySession(pack: Pack): PlaySession {
  const isVersus = pack.format === "nxn";
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  // Drawn items for every round, resolved once at mount — the per-group dedup
  // spans rounds, so the whole walk has to happen together (not per-round).
  const selections = useMemo(
    () => resolveRoundSelections(groups, rounds),
    [groups, rounds],
  );
  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);

  const isFinished = roundIndex >= totalRounds;
  const currentRound = !isFinished ? selections[roundIndex] : undefined;

  // Versus sides are the same two pools every round — read them off the first
  // round's two slots so the finished summary still has them once play is over.
  const firstSlots = rounds[0]?.slots ?? [];
  const sideA: VersusSide | undefined =
    isVersus && firstSlots[0]
      ? {
          id: firstSlots[0].groupId,
          name: groupNameById.get(firstSlots[0].groupId) ?? "",
        }
      : undefined;
  const sideB: VersusSide | undefined =
    isVersus && firstSlots[1]
      ? {
          id: firstSlots[1].groupId,
          name: groupNameById.get(firstSlots[1].groupId) ?? "",
        }
      : undefined;

  const candidates = !isVersus ? (currentRound?.slots[0]?.items ?? []) : [];
  const versusCandidatesA = isVersus
    ? (currentRound?.slots[0]?.items ?? [])
    : [];
  const versusCandidatesB = isVersus
    ? (currentRound?.slots[1]?.items ?? [])
    : [];

  // A single per-round model unifies the two formats so the rest of the code
  // reads one shape. `title` drives the UI; `resolvePick` turns the current
  // `selectedId` into the Pick to record (or null if invalid).
  // The author-given round name drives the heading when set; otherwise the
  // round falls back to its group's name (elimination) or "Round N" (versus).
  const roundName = rounds[roundIndex]?.name?.trim() ?? "";

  const round = isVersus
    ? {
        title: roundName || `Round ${roundIndex + 1}`,
        resolvePick(id: string): Pick | null {
          const side =
            id === sideA?.id ? sideA : id === sideB?.id ? sideB : null;
          if (!side) return null;
          return { roundIndex, groupId: side.id, itemTitle: side.name };
        },
      }
    : {
        title:
          roundName ||
          (currentRound
            ? (groupNameById.get(currentRound.slots[0]?.groupId ?? "") ?? "")
            : ""),
        resolvePick(id: string): Pick | null {
          const slot = currentRound?.slots[0];
          const item = candidates.find((candidate) => candidate.id === id);
          if (!slot || !item) return null;
          return {
            roundIndex,
            groupId: slot.groupId,
            itemId: item.id,
            itemTitle: item.title,
          };
        },
      };

  // Every candidate is shown at once (they fade in staggered in the UI), so a
  // pick is confirmable as soon as something is selected.
  const canConfirm = selectedId !== null;

  function confirmPick() {
    if (!canConfirm || selectedId === null) return;
    const pick = round.resolvePick(selectedId);
    if (!pick) return;
    setPicks((prev) => [...prev, pick]);
    setRoundIndex((prev) => prev + 1);
    setSelectedId(null);
  }

  // Fires once when the last round is confirmed: records the play, then stashes
  // the picks for the result page — only once we know the server actually
  // counted them, so "your pick" never shows a percentage that didn't include
  // your own vote (e.g. after a failed request).
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || recordedRef.current) return;
    recordedRef.current = true;
    const recordedPicks = picks.map(toRecordedPick);
    playsClient
      .record(pack.id, { picks: recordedPicks })
      .then(() => writeLastPlayPicks(pack.id, recordedPicks))
      .catch(() => undefined);
  }, [isFinished, pack.id, picks]);

  const progressPct = isFinished
    ? 100
    : Math.round((roundIndex / Math.max(totalRounds, 1)) * 100);
  const showRound = isVersus
    ? Boolean(currentRound && sideA && sideB)
    : Boolean(currentRound);

  return {
    isVersus,
    roundIndex,
    totalRounds,
    isFinished,
    progressPct,
    showRound,
    roundTitle: round.title,
    canConfirm,
    selectedId,
    setSelectedId,
    picks,
    confirmPick,
    candidates,
    sideA,
    sideB,
    versusCandidatesA,
    versusCandidatesB,
  };
}
