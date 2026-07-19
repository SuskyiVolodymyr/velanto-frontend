"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { decodePicks } from "@/src/shared/lib/share-url";
import { useSharedPlay } from "@/src/features/result/api/shared-play.queries";
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * The picks to overlay on a result screen. A share link wins (someone shared
 * their result — shared: true), otherwise this reader's own last play from
 * sessionStorage (shared: false). The live community aggregate is fetched
 * separately and is identical either way.
 *
 * Two share forms are accepted:
 *   - `?play=<id>` — the short form: a reference to the server-persisted play,
 *     resolved by a fetch (constant-length URL regardless of pack size).
 *   - `?p=<encoded>` — the legacy inline payload, decoded synchronously so old
 *     links keep working.
 *
 * `ready` distinguishes "haven't looked yet" from "looked, found nothing" — for
 * `?play=` it stays false until the fetch settles, and the own-picks read only
 * happens after mount. Callers gating on evidence of a play (#222) must wait for
 * `ready`, or a `?play=` viewer sees the locked state flash before it resolves.
 * A `?play=` that 404s (bad/expired id) degrades to the reader's own picks.
 */
export function useResultPicks(packId: string): {
  picks: RecordedPick[] | null;
  shared: boolean;
  ready: boolean;
} {
  const searchParams = useSearchParams();
  const playId = searchParams.get("play");
  const code = searchParams.get("p");

  const sharedQuery = useSharedPlay(playId);
  // Memoized on the stable `code` string so both the effect deps below and the
  // returned `picks` reference stay stable across re-renders.
  const decodedPicks = useMemo(() => (code ? decodePicks(code) : null), [code]);

  const fetchedPicks = playId ? (sharedQuery.data?.picks ?? null) : null;
  const playPending = playId !== null && sharedQuery.isPending;
  // Skip the own-picks read whenever a share is (or is still becoming) the
  // source: a valid `?p=`, a pending `?play=` fetch, or a resolved `?play=` with
  // picks. A failed `?play=` falls through to the own read.
  const shareOwnsResult =
    decodedPicks !== null ||
    playPending ||
    (fetchedPicks !== null && fetchedPicks.length > 0);

  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);
  const [ready, setReady] = useState(false);
  // Client-only sessionStorage read after mount (not an async fetch). Deliberate
  // set-state-in-effect: readLastPlayPicks builds a fresh array each call, which
  // breaks useSyncExternalStore's stable-snapshot contract, so a narrow mounted
  // read is the simplest safe shape.
  useEffect(() => {
    if (shareOwnsResult) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(packId));
    setReady(true);
  }, [packId, shareOwnsResult]);

  if (playId !== null) {
    if (sharedQuery.isPending)
      return { picks: null, shared: true, ready: false };
    if (fetchedPicks && fetchedPicks.length > 0) {
      return { picks: fetchedPicks, shared: true, ready: true };
    }
    // Bad/expired id — fall through to this reader's own picks.
  }
  if (decodedPicks) return { picks: decodedPicks, shared: true, ready: true };
  return { picks: ownPicks, shared: false, ready };
}
