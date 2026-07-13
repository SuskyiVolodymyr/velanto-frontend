"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { EditPackScreen } from "@/src/features/create/EditPackScreen";

/**
 * Edit-page counterpart to {@link PackDetailFallback}. When the Server
 * Component's anonymous fetch returns null — which happens routinely here,
 * since editing re-moderates a pack back to `pending` and pending packs aren't
 * publicly fetchable — this retries as the authenticated viewer so the author
 * can keep editing their own not-yet-approved pack. Results aren't needed for
 * the edit form, so `needsResults: false`.
 */
export function EditPackFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: false });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <EditPackScreen pack={state.pack} />;
}
