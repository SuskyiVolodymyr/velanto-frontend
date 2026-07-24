"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState, RoomState } from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

interface RoomBetweenProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}

/**
 * The interstitial shown after a round resolves: the surviving item up top in
 * green, the full board below with every eliminated item carrying the avatar of
 * whoever sacrificed it, and a Next button that waits on everyone.
 */
export function RoomBetween({
  state,
  currentUserId,
  onNext,
}: RoomBetweenProps) {
  const t = useTranslations("room");
  const round = state.round;

  const claimantByItem = useMemo(() => {
    const map = new Map<string, RoomPlayerState>();
    if (!round) return map;
    const byId = new Map(state.players.map((p) => [p.userId, p]));
    for (const [userId, itemId] of Object.entries(round.claims)) {
      const player = byId.get(userId);
      if (player) map.set(itemId, player);
    }
    return map;
  }, [round, state.players]);

  if (!round || !round.survivorItemId) return null;

  const survivor = round.items.find((i) => i.id === round.survivorItemId);
  const survivorIndex = round.items.findIndex(
    (i) => i.id === round.survivorItemId,
  );

  const me = state.players.find((p) => p.userId === currentUserId) ?? null;
  // The room advances only once EVERY seated player has pressed Next
  // (advanceIfAllNext waits on the full roster, not just connected players), so
  // the denominator is the whole seated roster — same rule as the round's
  // "chosen" counter.
  const ready = state.players.filter((p) => p.next).length;
  const total = state.players.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("between.survivorHeading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl text-success">
          {t("between.survivorNote")}
        </Text>
      </header>

      {survivor && (
        <div className="max-w-md">
          <RoomItemCard
            item={survivor}
            index={survivorIndex}
            status="survivor"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-sm">
          {t("between.boardHeading")}
        </Text>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {round.items.map((item, index) => {
            const isSurvivor = item.id === round.survivorItemId;
            return (
              <RoomItemCard
                key={item.id}
                item={item}
                index={index}
                status={isSurvivor ? "survivor" : "sacrificed"}
                claimant={isSurvivor ? null : claimantByItem.get(item.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text
            variant="secondary"
            aria-live="polite"
            className={cn("text-sm", ready === total && "text-success")}
          >
            {t("between.ready", { count: ready, total })}
          </Text>
          <AutoNextCountdown
            key={state.autoNextAt ?? "none"}
            at={state.autoNextAt}
          />
        </div>
        <Button disabled={me?.next ?? false} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/**
 * How long the room will wait before advancing itself.
 *
 * The deadline is the server's — this only counts down to it, so a client whose
 * clock or tab has drifted still advances when the server says, and simply
 * shows 0 in the meantime. Rendered as plain text rather than a progress ring
 * because it is a reassurance ("the game isn't stuck"), not the main action.
 */
function AutoNextCountdown({ at }: { at: number | null }) {
  const t = useTranslations("room");
  // Keyed on the deadline by its caller, so a new round remounts this and the
  // initializer re-reads the clock. That keeps the effect free of a synchronous
  // setState — the interval is the only thing that ever writes.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (at === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [at]);

  if (at === null) return null;
  const seconds = Math.max(0, Math.ceil((at - now) / 1000));
  return (
    <Text variant="tertiary" className="text-xs">
      {t("between.autoNext", { seconds })}
    </Text>
  );
}
