"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";

export function PackDetailFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: true });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <PackDetailScreen pack={state.pack} results={state.results!} />;
}
