"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/shared/hooks/use-pack-fallback";
import { PlayRouter } from "@/features/play/PlayRouter";

export function PlayFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: false });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <PlayRouter pack={state.pack} />;
}
