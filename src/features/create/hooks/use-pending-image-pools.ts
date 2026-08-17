import { useMemo, useState } from "react";
import type { PendingImageDrafts } from "@/features/create/pending-image-drafts";

/**
 * Tracks which pools have an open item panel holding an uploaded-but-
 * uncommitted image (#437), and hands back the provider value the panels
 * report through.
 *
 * State rather than a ref: `onValid` reads `pools`, and it is reachable from
 * the `handleSubmit(...)` call made during render, where react-hooks/refs
 * rejects a ref read. It costs nothing — this changes when an image is staged
 * or committed, not per keystroke, and the update is a no-op when the status is
 * unchanged.
 */
export function usePendingImagePools(): {
  pools: readonly number[];
  drafts: PendingImageDrafts;
} {
  const [pools, setPools] = useState<readonly number[]>([]);

  const drafts = useMemo<PendingImageDrafts>(
    () => ({
      report: (index, pending) =>
        setPools((current) => {
          if (pending === current.includes(index)) return current;
          return pending
            ? [...current, index]
            : current.filter((pool) => pool !== index);
        }),
    }),
    [],
  );

  return { pools, drafts };
}
