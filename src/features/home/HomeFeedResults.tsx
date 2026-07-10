"use client";

import type { Pack } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { PackCard } from "@/src/features/home/PackCard";

export function HomeFeedResults({
  status,
  packs,
}: {
  status: "loading" | "ready" | "error";
  packs: Pack[];
}) {
  if (status === "loading")
    return <Text variant="secondary">Loading packs…</Text>;
  if (status === "error") {
    return (
      <Text className="text-[#ff6b6b]">
        Couldn&apos;t load packs. Try again later.
      </Text>
    );
  }
  if (packs.length === 0) {
    return <Text variant="secondary">No packs match these filters yet.</Text>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}
