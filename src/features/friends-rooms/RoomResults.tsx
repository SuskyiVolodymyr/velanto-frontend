"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { RoomPlayerState, RoomState } from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

/**
 * The end screen: one block per round, in order, each showing every item with
 * the sacrificer's avatar beside the eliminated ones and the survivor in green.
 * This is the shareable summary — wiring an actual share is a later task, so no
 * backend call is made here.
 */
export function RoomResults({ state }: { state: RoomState }) {
  const t = useTranslations("room");
  const byId = new Map(state.players.map((p) => [p.userId, p]));

  const claimantFor = (
    claims: Record<string, string>,
    itemId: string,
  ): RoomPlayerState | null => {
    for (const [userId, claimed] of Object.entries(claims)) {
      if (claimed === itemId) return byId.get(userId) ?? null;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("results.heading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {state.packTitle}
        </Text>
      </header>

      {state.results.map((result) => (
        <section
          key={result.index}
          aria-label={t("results.roundLabel", { index: result.index + 1 })}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-5"
        >
          {/* The round's own name when it had one — this screen is where a
              player reviews the whole game, so numbering every block defeats
              the point of naming them. The section's accessible name stays the
              stable "Round N" so the landmark list reads as an ordered game. */}
          <Text variant="title" className="text-sm">
            {result.name ||
              t("results.roundLabel", { index: result.index + 1 })}
          </Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item, index) => {
              const isSurvivor = item.id === result.survivorItemId;
              return (
                <RoomItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  status={isSurvivor ? "survivor" : "sacrificed"}
                  claimant={
                    isSurvivor ? null : claimantFor(result.claims, item.id)
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
