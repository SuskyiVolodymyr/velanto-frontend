"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { ResultScreen } from "@/src/features/result/ResultScreen";

export function ResultFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: true });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <ResultScreen pack={state.pack} results={state.results!} />;
}
