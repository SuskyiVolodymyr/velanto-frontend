"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { playsClient } from "@/src/shared/lib/plays-client";
import {
  writeLastPlayPicks,
  writeLastPlayId,
} from "@/src/shared/lib/last-play-storage";
import { useRoundSelections } from "@/src/features/play/use-round-selections";
import { scrollToRoundTop } from "@/src/features/play/scroll-to-round-top";
import type { Item, Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export interface Pick {
  roundIndex: number;
  groupId: string;
  // Two-pool versus picks carry no itemId (a side is chosen). Elimination and
  // single-pool versus picks carry the chosen/drawn item.
  itemId?: string;
  // Display label: the item title, or the side name for two-pool versus picks.
  itemTitle: string;
  // Single-pool versus only: whether this drawn item was on the chosen side.
  chosen?: boolean;
}

// A versus side, derived per round from the current round's two slots.
export interface VersusSide {
  id: string;
  name: string;
}

export interface PlaySession {
  isVersus: boolean;
  roundIndex: number;
  totalRounds: number;
  isFinished: boolean;
  // True once the finish record has settled (resolved or failed); PlayScreen
  // navigates straight to the result page on this, so there's no interstitial
  // "all rounds done" step.
  recordSettled: boolean;
  progressPct: number;
  showRound: boolean;
  roundTitle: string;
  // True on the final round, so the confirm button can read "see results"
  // instead of "next round".
  isLastRound: boolean;
  // Versus selection is the chosen SIDE index ("0" | "1") — not a group id, so
  // the two sides stay distinguishable even when they draw from one pool.
  canConfirm: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  // Every recorded pick (single-pool versus records one per drawn item on both
  // sides). Fed to the record request and the local stash.
  picks: Pick[];
  // What to SHOW as "your picks" — the chosen items only (single-pool versus
  // records the unchosen side too, which shouldn't appear in the summary).
  displayPicks: Pick[];
  confirmPick: () => void;
  // Groups format: the drawn candidates for the current round's single slot.
  candidates: Item[];
  // Versus (nxn/1v1): the current round's two sides and their drawn items.
  sideA?: VersusSide;
  sideB?: VersusSide;
  versusCandidatesA: Item[];
  versusCandidatesB: Item[];
  // True when the current versus round draws both sides from one pool.
  versusSinglePool: boolean;
}

function toRecordedPick(pick: Pick): RecordedPick {
  return {
    roundIndex: pick.roundIndex,
    groupId: pick.groupId,
    ...(pick.itemId !== undefined ? { itemId: pick.itemId } : {}),
    ...(pick.chosen !== undefined ? { chosen: pick.chosen } : {}),
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
  const { status } = useAuth();
  // 1v1 has its own head-to-head screen (HeadToHeadPlayScreen); this hook drives
  // the nxn versus path and the elimination formats.
  const isVersus = pack.format === "nxn";
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  // Drawn items for every round, resolved once after mount — the per-group
  // dedup spans rounds, so the whole walk has to happen together (not
  // per-round). Null until the client has drawn; see useRoundSelections.
  const resolved = useRoundSelections(groups, rounds);
  const selections = resolved ?? [];
  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [recordSettled, setRecordSettled] = useState(false);

  const isFinished = roundIndex >= totalRounds;
  const isLastRound = !isFinished && roundIndex === totalRounds - 1;
  const currentRound = !isFinished ? selections[roundIndex] : undefined;

  // Versus sides are per ROUND now (matchups may vary) — read them off the
  // CURRENT round's two slots. Undefined once play is finished (no round).
  const currentSlots = currentRound?.slots ?? [];
  const sideA: VersusSide | undefined =
    isVersus && currentSlots[0]
      ? {
          id: currentSlots[0].groupId,
          name: groupNameById.get(currentSlots[0].groupId) ?? "",
        }
      : undefined;
  const sideB: VersusSide | undefined =
    isVersus && currentSlots[1]
      ? {
          id: currentSlots[1].groupId,
          name: groupNameById.get(currentSlots[1].groupId) ?? "",
        }
      : undefined;
  // Both sides drawing from one pool → a single-pool matchup, recorded per item.
  const versusSinglePool = Boolean(
    isVersus && sideA && sideB && sideA.id === sideB.id,
  );

  const candidates = !isVersus ? (currentRound?.slots[0]?.items ?? []) : [];
  const versusCandidatesA = isVersus ? (currentSlots[0]?.items ?? []) : [];
  const versusCandidatesB = isVersus ? (currentSlots[1]?.items ?? []) : [];

  // A single per-round model unifies the formats so the rest of the code reads
  // one shape. `title` drives the heading; `resolvePicks` turns the current
  // `selectedId` into the pick(s) to record (empty if invalid). The author-given
  // round name wins; otherwise the round falls back to its group's name
  // (elimination) or "Round N" (versus).
  const roundName = rounds[roundIndex]?.name?.trim() ?? "";

  const round = isVersus
    ? {
        title: roundName || `Round ${roundIndex + 1}`,
        // Versus selection is the chosen SIDE INDEX ("0" | "1"), recorded as one
        // pick per DRAWN ITEM across both sides — each under the pool it was
        // drawn from, `chosen` marking the picked side.
        //
        // Two-pool rounds used to record only the winning pool. That named the
        // side but not what was on it, so a result could never show the player
        // the matchup they were looking at; single-pool always recorded per
        // item because both sides share a group id. This is now the one shape.
        //
        // Emitted in SLOT order (side A then side B), not chosen-first: the
        // array order is what tells the result screen which side each item was
        // on, and for a single-pool round the group ids can't.
        resolvePicks(id: string): Pick[] {
          const sideIndex = id === "0" ? 0 : id === "1" ? 1 : -1;
          if (!currentSlots[sideIndex]) return [];
          return currentSlots.flatMap((slot, side) =>
            slot.items.map((item) => ({
              roundIndex,
              groupId: slot.groupId,
              itemId: item.id,
              itemTitle: item.title,
              chosen: side === sideIndex,
            })),
          );
        },
      }
    : {
        title:
          roundName ||
          (currentRound
            ? (groupNameById.get(currentRound.slots[0]?.groupId ?? "") ?? "")
            : ""),
        resolvePicks(id: string): Pick[] {
          const slot = currentRound?.slots[0];
          const item = candidates.find((candidate) => candidate.id === id);
          if (!slot || !item) return [];
          return [
            {
              roundIndex,
              groupId: slot.groupId,
              itemId: item.id,
              itemTitle: item.title,
            },
          ];
        },
      };

  // Every candidate is shown at once (they fade in staggered in the UI), so a
  // pick is confirmable as soon as something is selected.
  const canConfirm = selectedId !== null;

  function confirmPick() {
    if (!canConfirm || selectedId === null) return;
    const roundPicks = round.resolvePicks(selectedId);
    if (roundPicks.length === 0) return;
    setPicks((prev) => [...prev, ...roundPicks]);
    setRoundIndex((prev) => prev + 1);
    scrollToRoundTop();
    setSelectedId(null);
  }

  // Fires once when the last round is confirmed. Anonymous plays ARE recorded
  // (velanto-frontend#221 / backend#176) — the endpoint takes an optional JWT
  // and stores a null player. We still wait for auth to resolve first: sending
  // before the token is available would record a signed-in player's run as
  // anonymous, losing it from their history.
  //
  // The picks are stashed FIRST, and never conditionally on the request. They
  // used to be written in .then() so "your pick" could never show a percentage
  // that excluded your own vote — a cosmetic guarantee that stopped being worth
  // its cost once #222 gated the result screen on these picks: a slow or failed
  // request would lock out the player who just finished the pack. The redirect
  // below still waits for recordSettled, so the aggregate normally does include
  // your vote; if the request fails, a slightly stale percentage beats no
  // result screen at all.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || status === "loading" || recordedRef.current) return;
    recordedRef.current = true;
    const recordedPicks = picks.map(toRecordedPick);
    writeLastPlayPicks(pack.id, recordedPicks);
    playsClient
      .record(pack.id, { picks: recordedPicks })
      // Stash the play id so the result screen can build a short `?play=` share
      // link. Best-effort: a failed record just falls back to the `?p=` payload.
      .then(({ id }) => {
        if (id) writeLastPlayId(pack.id, id);
      })
      .catch(() => undefined)
      .finally(() => setRecordSettled(true));
  }, [isFinished, pack.id, picks, status]);

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
    recordSettled,
    progressPct,
    showRound,
    roundTitle: round.title,
    isLastRound,
    canConfirm,
    selectedId,
    setSelectedId,
    picks,
    // Hide the unchosen side of a single-pool round from the "your picks" list.
    displayPicks: picks.filter((pick) => pick.chosen !== false),
    confirmPick,
    candidates,
    sideA,
    sideB,
    versusCandidatesA,
    versusCandidatesB,
    versusSinglePool,
  };
}
