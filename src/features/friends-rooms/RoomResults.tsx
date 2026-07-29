"use client";

import { useTranslations } from "next-intl";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";
import type { RoomPlayerState, RoomState } from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

/**
 * The end screen: one block per round, in order, each showing every item with
 * the sacrificer's avatar beside the eliminated ones and the survivor in green.
 * This is the shareable summary — wiring an actual share is a later task, so no
 * backend call is made here.
 */
export function RoomResults({
  state,
  packFormat = "sacrifice_one",
}: {
  state: RoomState;
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair.
   * Defaults to sacrifice_one, this board's original (and only) framing. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}) {
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

      {/* The only terminal state that does NOT leave on its own — a player
          should get to read their own game summary at their own pace — so it
          needs an explicit way out. A real link, so middle-click and
          open-in-new-tab work. */}
      <BackButton
        href={`/packs/${state.packId}`}
        label={t("results.backToPack")}
      />

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
                  format={packFormat}
                />
              );
            })}
          </div>

          {/* Turn-based cut's ordered cut history — see RoomBetween's
              identical block. Only `kind: "survivor"` results ever carry
              `cuts`; Claim's own rounds never populate it. */}
          {result.kind === "survivor" &&
            result.cuts &&
            result.cuts.length > 0 && (
              <ol
                aria-label={t("turnBasedCut.cutOrderHeading")}
                className="flex flex-wrap items-center gap-2"
              >
                {result.cuts.map((cut, index) => {
                  const cutter = byId.get(cut.userId);
                  const item = result.items.find((i) => i.id === cut.itemId);
                  return (
                    <li
                      key={`${cut.userId}-${cut.itemId}-${index}`}
                      className="flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold">
                        {cutter?.username ?? cut.userId}
                      </span>
                      <span className="text-foreground-tertiary">
                        {t("turnBasedCut.cutVerb")}
                      </span>
                      <span>{item?.title ?? cut.itemId}</span>
                    </li>
                  );
                })}
              </ol>
            )}
        </section>
      ))}
    </div>
  );
}
