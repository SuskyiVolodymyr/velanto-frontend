"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { ResultScreen } from "@/src/features/result/ResultScreen";

/**
 * Recovers the pack when the Server Component's anonymous fetch returned null —
 * a pending pack is hidden from strangers, so its own author's SSR fetch 404s
 * and only an authenticated retry finds it.
 *
 * `needsResults: false` since #243: ResultScreen fetches the results itself,
 * under the same condition that displays them. Asking for them here would
 * reintroduce exactly what that issue removed — a request made before anyone
 * knows whether the numbers will be shown.
 */
export function ResultFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: false });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <ResultScreen pack={state.pack} />;
}
