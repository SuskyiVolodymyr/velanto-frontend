"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { RoundItemTile } from "./RoundItemTile";
import { RevealSideRow } from "./RevealSideRow";
import { VsDivider } from "./VsDivider";
import type { RoomPlayerState, RoomState, SpyRoundResult } from "./room-types";

interface SpyBetweenBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}

/**
 * Spy's between-round beat: the round that just closed, with every pick landed
 * on the card that took it.
 *
 * The board is UN-REDACTED here, for the spy too. A resolved round has no
 * decision left in it, so holding it back would only stop the spy reading the
 * game they just played — and seeing what they were actually choosing between
 * is the payoff for having played it half-blind.
 */
export function SpyBetweenBoard({
  state,
  currentUserId,
  onNext,
}: SpyBetweenBoardProps) {
  const t = useTranslations("room");
  const rounds = state.results.filter(
    (result): result is SpyRoundResult => result.kind === "spy_round",
  );
  // The round still fresh in everyone's head.
  const closed = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const pickersByOption = new Map<string, RoomPlayerState[]>();
  for (const [userId, ids] of Object.entries(closed?.picks ?? {})) {
    const optionId = ids[0];
    const player = playerById.get(userId);
    if (!optionId || !player) continue;
    pickersByOption.set(optionId, [
      ...(pickersByOption.get(optionId) ?? []),
      player,
    ]);
  }

  const itemsById = new Map((closed?.items ?? []).map((i) => [i.id, i]));
  const me = state.players.find((p) => p.userId === currentUserId) ?? null;
  const ready = state.players.filter((p) => p.next).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs tracking-wide uppercase">
          {t("spy.picksHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {closed?.name ?? t("spy.reveal.historyHeading")}
        </Text>
      </header>

      {closed && closed.sides ? (
        // nxn: a pick names a SIDE, so the picks are keyed by side id and would
        // never match an item.
        <div className="flex flex-col gap-[14px]">
          {closed.sides.map((side, index) => (
            <Fragment key={side.id}>
              {index > 0 && <VsDivider />}
              <RevealSideRow
                side={side}
                items={side.itemIds
                  .map((id) => itemsById.get(id))
                  .filter((item): item is NonNullable<typeof item> =>
                    Boolean(item),
                  )}
                // Real usernames in the chip slot Guess-who fills with its
                // anonymous labels. Same affordance, and here the names ARE
                // the point — nothing about a Spy round is anonymous.
                pickLabels={(pickersByOption.get(side.id) ?? []).map(
                  (player) => ({
                    label: player.username,
                    className: "bg-white/10 text-foreground",
                  }),
                )}
              />
            </Fragment>
          ))}
        </div>
      ) : closed ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {closed.items.map((item) => (
            <RoundItemTile
              key={item.id}
              item={item}
              actionLabel={item.title}
              // Named, not a stack of anonymous avatars: the round is over, and
              // who chose what is the entire evidence base of the mode.
              voters={pickersByOption.get(item.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total: state.players.length })}
        </Text>
        <Button disabled={me?.next ?? false} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
