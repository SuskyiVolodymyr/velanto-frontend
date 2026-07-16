"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { decodePicks } from "@/src/shared/lib/share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * The picks to overlay on a result screen. A valid `?p=` share code wins
 * (someone shared their result — shared: true); otherwise this reader's own
 * last play from sessionStorage (shared: false). The live community aggregate
 * is fetched separately and is identical either way.
 *
 * `ready` distinguishes "haven't looked yet" from "looked, found nothing" —
 * the sessionStorage read only happens after mount, so `picks: null` means both
 * on first render. Callers gating on evidence of a play (#222) must wait for
 * `ready`, or every player sees the locked state flash before their results.
 */
export function useResultPicks(packId: string): {
  picks: RecordedPick[] | null;
  shared: boolean;
  ready: boolean;
} {
  const searchParams = useSearchParams();
  const code = searchParams.get("p");
  // Memoized on the stable `code` string so both the effect deps below and the
  // returned `picks` reference stay stable across re-renders (a consumer may put
  // `picks` in its own dependency array).
  const sharedPicks = useMemo(() => (code ? decodePicks(code) : null), [code]);

  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);
  const [ready, setReady] = useState(false);
  // This is a client-only sessionStorage read after mount (not an async fetch),
  // so a data-fetching query doesn't apply. The useHydratedValue helper doesn't
  // fit either: readLastPlayPicks builds a fresh array each call, which violates the
  // Object.is-stable-snapshot contract useSyncExternalStore requires. A narrowly
  // scoped mounted-read with a cancel-free single setState is the simplest safe
  // shape, so the set-state-in-effect disable is kept deliberately here.
  useEffect(() => {
    if (sharedPicks) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(packId));
    setReady(true);
  }, [packId, sharedPicks]);

  // A share code needs no storage read, so it is ready on the first render.
  if (sharedPicks) return { picks: sharedPicks, shared: true, ready: true };
  return { picks: ownPicks, shared: false, ready };
}
