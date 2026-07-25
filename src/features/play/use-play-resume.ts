"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { packStructureHash } from "@/src/features/play/pack-structure-hash";
import { randomSeed } from "@/src/features/play/seeded-rng";
import {
  deletePlayResume,
  readPlayResume,
  writePlayResume,
} from "@/src/features/play/play-resume-storage";
import type { Pack } from "@/src/shared/types/pack";

export interface PlayResume {
  /** True once the post-mount storage read has run (seed is set). */
  ready: boolean;
  /**
   * The deterministic draw seed for this play — null until `ready`. Fed to
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
 */
export function usePlayResume(pack: Pack): PlayResume {
  const packVersion = useMemo(() => packStructureHash(pack), [pack]);
  const [state, setState] = useState<ResumeState | null>(null);

  const initialisedRef = useRef(false);
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    const saved = readPlayResume(pack.id, packVersion);
    setState(
      saved
        ? { seed: saved.seed, roundIndex: saved.roundIndex, choices: saved.choices }
        : { seed: randomSeed(), roundIndex: 0, choices: null },
    );
  }, [pack.id, packVersion]);

  const seed = state?.seed ?? null;

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

  return {
    ready: state !== null,
    seed,
    initialRoundIndex: state?.roundIndex ?? 0,
    initialChoices: state?.choices ?? null,
    saveProgress,
    clearProgress,
  };
}
