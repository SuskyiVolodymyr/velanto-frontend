"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { decodePicks } from "@/src/shared/lib/share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * The picks to overlay on a result screen. A valid `?p=` share code wins
 * (someone shared their result — shared: true); otherwise this reader's own
 * last play from sessionStorage (shared: false). The live community aggregate
 * is fetched separately and is identical either way.
 */
export function useResultPicks(packId: string): {
  picks: RecordedPick[] | null;
  shared: boolean;
} {
  const searchParams = useSearchParams();
  const code = searchParams.get("p");
  const sharedPicks = code ? decodePicks(code) : null;

  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);
  useEffect(() => {
    if (sharedPicks) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(packId));
  }, [packId, sharedPicks]);

  if (sharedPicks) return { picks: sharedPicks, shared: true };
  return { picks: ownPicks, shared: false };
}
