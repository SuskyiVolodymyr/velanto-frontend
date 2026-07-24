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
 * The deadline is the server's and only the server acts on it — this just draws
 * it, so a client counting down early never advances anything. The two clocks
 * can disagree in either direction: a client running ahead of the server sits
 * on 0 until `round.started` lands, one running behind shows a number that
 * jumps when it does. Neither is worth correcting for a five-second window.
 *
 * Plain text rather than a progress ring because it is a reassurance ("the game
 * isn't stuck"), not the main action — and deliberately OUTSIDE the aria-live
 * region beside it, since announcing a per-second tick would drown out the
 * "N / M ready" updates that actually matter.
 */
function AutoNextCountdown({ at }: { at: number | null }) {
  const t = useTranslations("room");
  // The caller keys this on the deadline so a new round remounts it and the
  // initializer re-reads the clock. Cosmetic — the [at] dependency below already
  // restarts the interval; the remount just avoids one frame of a stale `now`.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (at === null) return;
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      // Stop at the deadline. Normally this component unmounts within seconds,
      // but a socket that drops during `between` keeps the last board mounted
      // under the reconnecting banner (see RoomScreen) — without this it would
      // re-render 4x/s for as long as the tab stayed open, showing a frozen 0.
      if (tick >= at) clearInterval(id);
    }, 250);
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
