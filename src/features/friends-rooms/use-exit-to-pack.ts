"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * How long a dead-end room stays on screen before returning you to the pack.
 * Long enough to read WHY you are out — "the host removed you" is worth a beat
 * — short enough that nobody is stranded on a screen with nothing to do.
 */
export const EXIT_TO_PACK_MS = 6_000;

/**
 * Send the viewer back to the pack once a room has nothing left to offer.
 *
 * Used by the terminal states whose socket is already gone: "this room has
 * ended", an abandoned room, and being removed by the host. The pack — not the
 * home feed — because that is where a new room gets started, and it is the page
 * they came from.
 *
 * The results screen deliberately does NOT use this: it is the one terminal
 * state with something worth reading, and pulling a player off their own game
 * summary would undo the fix that made it render at all. It gets a link.
 *
 * Lives in its own module rather than in RoomScreen so RoomKicked can share it
 * without importing its own parent.
 */
export function useExitToPack(packId: string | null) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(
      () => router.push(packId ? `/packs/${packId}` : "/"),
      EXIT_TO_PACK_MS,
    );
    return () => clearTimeout(timer);
  }, [packId, router]);
}
