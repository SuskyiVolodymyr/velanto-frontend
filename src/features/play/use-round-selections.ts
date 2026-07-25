"use client";

import { useEffect, useRef, useState } from "react";
import {
  resolveRoundSelections,
  type SelectedRound,
} from "@/src/features/play/round-sampling";
import { mulberry32 } from "@/src/features/play/seeded-rng";
import type { Group, Round } from "@/src/shared/types/pack";

/**
 * A play's drawn items, resolved once — on the CLIENT only.
 *
 * `resolveRoundSelections` shuffles with `Math.random()`, and every play screen
 * is a Client Component, which Next still renders on the server for the initial
 * HTML. So the draw ran twice against two different random sequences: the
 * server sent one set of items and the client rendered another, and React
 * discarded the whole tree as a hydration mismatch (velanto-frontend#334).
 *
 * Returning `null` until after mount makes the server's HTML and the client's
 * first render identical — neither draws — and the real draw happens in the
 * effect, which the server never runs. Callers render a loading state while
 * this is null.
 *
 * Resolved ONCE per pack, deliberately: `groups`/`rounds` are usually rebuilt
 * on each render (`pack.groups ?? []`), so a dependency on them would redraw
 * every render and swap items under the player mid-round.
 *
 * `seed` selects the randomness source. Omit it (`undefined`) for the original
 * fresh-every-play behaviour (`Math.random`). Pass a number to draw with a
 * seeded generator so the same play can be resumed with an identical draw (see
 * usePlayResume). Pass `null` to signal "seed not resolved yet" — the draw waits
 * until a real seed arrives, which is what keeps a resumed play deterministic
 * (the seed is read from storage after mount, so it starts null).
 */
export function useRoundSelections(
  groups: Group[],
  rounds: Round[],
  seed?: number | null,
): SelectedRound[] | null {
  const [selections, setSelections] = useState<SelectedRound[] | null>(null);
  // Guarded the same way as the record-once effects on the play screens: the
  // deps below are freshly-built arrays on most renders, so without this the
  // effect would redraw constantly and swap items under the player mid-round.
  const drawnRef = useRef(false);

  useEffect(() => {
    // null means the caller is still waiting on its seed — don't draw yet, and
    // don't burn the one-shot guard, so the real seed can draw when it lands.
    if (drawnRef.current || seed === null) return;
    drawnRef.current = true;
    const rng = seed === undefined ? Math.random : mulberry32(seed);
    setSelections(resolveRoundSelections(groups, rounds, rng));
  }, [groups, rounds, seed]);

  return selections;
}
