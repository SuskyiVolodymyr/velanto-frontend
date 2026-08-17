"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/shared/hooks/use-pack-fallback";
import { packsClient } from "@/shared/api/packs-client";
import { PackDetailScreen } from "@/features/pack/PackDetailScreen";

export function PackDetailFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, {
    needsResults: true,
    needsAvailableModes: true,
    fetchPack: packsClient.getOverview,
  });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return (
    <PackDetailScreen
      pack={state.pack}
      results={state.results!}
      availableModes={state.availableModes!}
    />
  );
}
