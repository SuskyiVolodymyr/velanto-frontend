"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { packStructureHash } from "@/src/features/play/pack-structure-hash";
import { randomSeed } from "@/src/features/play/seeded-rng";
import {
  deletePlayResume,
  readPlayResume,
  writePlayResume,
} from "@/src/features/play/play-resume-storage";
import { consumePlayIntent } from "@/src/features/play/play-intent-storage";
import type { Pack } from "@/src/shared/types/pack";

export interface PlayResume {
  /** True once the post-mount storage read has run (seed is set). */
  ready: boolean;
  /**
   * The deterministic draw seed for this play — null until `ready`, and
   * withheld again while `needsChoice` is true (see below). Fed to
   * `useRoundSelections` so the draw stays identical across a resume.
   */
  seed: number | null;
  /** Where a resumed play picks up (0 for a fresh play). */
  initialRoundIndex: number;
  /** Restored per-screen progress (the screen's own `choices` shape), or null. */
  initialChoices: unknown;
  /** Save progress after a finished round. No-op until `ready`. */
  saveProgress: (roundIndex: number, choices: unknown) => void;
  /** Delete the record — called once the play completes. */
  clearProgress: () => void;
  /**
   * True once a saved, in-progress play was found and the player hasn't yet
   * said whether to continue it or start over. A fresh play (no saved
   * record, or one invalidated by a packVersion mismatch/TTL) has nothing to
   * choose between, so this never engages for it — and neither does an
   * arrival carrying a one-shot navigation intent (see play-intent-storage.ts):
   * the intent pre-answers the choice, so this is only for a genuinely
   * ambiguous arrival (a refresh, a bookmark, a typed URL).
   *
   * While true, `seed` stays null. `useRoundSelections` draws exactly once,
   * as soon as it sees a non-null seed — exposing the saved seed immediately
   * would let that one-shot draw fire before the player decides, and a
   * subsequent Restart's fresh seed would then arrive too late to matter.
   * Callers must render the resume-choice prompt instead of any round
   * content while this is true.
   */
  needsChoice: boolean;
  /**
   * Resume exactly where the saved play left off: releases the withheld
   * seed as-is, so `useRoundSelections` draws the identical rounds/items, and
   * `initialRoundIndex`/`initialChoices` (already the saved values) are ready
   * for the caller's own restore effect to apply — the same result a fresh
   * navigation from the "Continue playing" rail produces.
   */
  chooseContinue: () => void;
  /**
   * Discard the saved play and start over: deletes the stored record outright
   * (so a reload before any new progress can't re-offer it) and mints a
   * brand-new seed from round 0, so the next draw is a genuinely different
   * one rather than a replay.
   */
  chooseRestart: () => void;
}

interface ResumeState {
  seed: number;
  roundIndex: number;
  choices: unknown;
}

/**
 * Establishes and persists the resume state for a single-player play, shared by
 * all three play screens. The seed and any saved progress are read from
 * localStorage ONCE, after mount — never during render — so the server-rendered
 * HTML and the client's first render match (the draw is deferred the same way in
 * useRoundSelections; velanto-frontend#334). A fresh play mints a new seed but
 * writes nothing until its first round is saved, so a pack only joins the
 * resume list once the player has actually made progress.
 *
 * Invalidation is delegated to the storage layer: a record whose `packVersion`
 * no longer matches the pack's current structure (the author edited it) or that
 * has aged past the TTL is dropped on read, and this hook then mints a fresh
 * seed as if there were no saved play.
 *
 * A REAL saved record additionally gates behind `needsChoice`: the caller must
 * show a resume-choice prompt and call `chooseContinue`/`chooseRestart` before
 * the seed or restored progress become usable — see `needsChoice`'s own doc.
 */
export function usePlayResume(pack: Pack): PlayResume {
  const packVersion = useMemo(() => packStructureHash(pack), [pack]);
  const [state, setState] = useState<ResumeState | null>(null);
  // Whether the initial read found a REAL saved record — distinct from
  // `state`, which is populated either way (fresh or restored). A fresh play
  // has nothing to choose between, so `needsChoice` never engages for it.
  const [hadSavedRecord, setHadSavedRecord] = useState(false);
  const [decision, setDecision] = useState<"continue" | "restart" | null>(null);

  const initialisedRef = useRef(false);
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    const saved = readPlayResume(pack.id, packVersion);
    // A one-shot navigation intent (see play-intent-storage.ts) pre-answers
    // the choice a genuinely ambiguous arrival (refresh, bookmark, typed URL)
    // would need to ask: PackPlayButton sets "restart" (Play always starts
    // over), ContinuePlayingRail sets "continue" (its card always resumes).
    // Consumed here — a refresh of the resulting page never re-sets it, so it
    // corrects back to asking on its own.
    const intent = consumePlayIntent(pack.id);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (intent === "restart") {
      if (saved) deletePlayResume(pack.id);
      setState({ seed: randomSeed(), roundIndex: 0, choices: null });
    } else if (intent === "continue" && saved) {
      setState({
        seed: saved.seed,
        roundIndex: saved.roundIndex,
        choices: saved.choices,
      });
      setDecision("continue");
    } else if (saved) {
      setHadSavedRecord(true);
      setState({
        seed: saved.seed,
        roundIndex: saved.roundIndex,
        choices: saved.choices,
      });
    } else {
      setState({ seed: randomSeed(), roundIndex: 0, choices: null });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pack.id, packVersion]);

  const needsChoice = hadSavedRecord && decision === null;
  const seed = needsChoice ? null : (state?.seed ?? null);

  const saveProgress = useCallback(
    (roundIndex: number, choices: unknown) => {
      if (seed === null) return;
      writePlayResume({
        packId: pack.id,
        seed,
        packVersion,
        roundIndex,
        choices,
        // Snapshot the pack's display fields so the "Continue playing" rail can
        // render this card without re-fetching the pack. Refreshed every save.
        pack: {
          title: pack.title,
          coverTone: pack.coverTone,
          totalRounds: (pack.rounds ?? []).length,
        },
        updatedAt: Date.now(),
      });
    },
    [seed, pack.id, pack.title, pack.coverTone, pack.rounds, packVersion],
  );

  const clearProgress = useCallback(() => {
    deletePlayResume(pack.id);
  }, [pack.id]);

  const chooseContinue = useCallback(() => {
    setDecision("continue");
  }, []);

  const chooseRestart = useCallback(() => {
    deletePlayResume(pack.id);
    setState({ seed: randomSeed(), roundIndex: 0, choices: null });
    setDecision("restart");
  }, [pack.id]);

  return {
    ready: state !== null,
    seed,
    initialRoundIndex: state?.roundIndex ?? 0,
    initialChoices: state?.choices ?? null,
    saveProgress,
    clearProgress,
    needsChoice,
    chooseContinue,
    chooseRestart,
  };
}
