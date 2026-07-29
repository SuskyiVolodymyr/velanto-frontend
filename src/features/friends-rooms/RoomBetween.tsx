"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type { RoomPlayerState, RoomState } from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

interface RoomBetweenProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair.
   * Defaults to sacrifice_one, this board's original (and only) framing. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
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
  packFormat = "sacrifice_one",
}: RoomBetweenProps) {
  const t = useTranslations("room");
  const round = state.round;
  const verb = packFormat === "save_one" ? "Save" : "Sacrifice";

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
          {t(`between.survivorHeading${verb}`)}
        </Text>
        <Text as="h2" variant="title" className="text-2xl text-success">
          {t(`between.survivorNote${verb}`)}
        </Text>
      </header>

      {survivor && (
        <div className="max-w-md">
          <RoomItemCard
            item={survivor}
            index={survivorIndex}
            status="survivor"
            format={packFormat}
          />
        </div>
      )}

      {/* Turn-based cut: SurvivorRoundResult carries an optional `cuts` list
          (the order cuts happened in), since a single player may cut more
          than once in a round — the per-item claimant map alone doesn't
          convey ORDER. Claim's own rounds never populate `round.cuts`, so
          this renders only for Turn-based cut. */}
      {round.cuts && round.cuts.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text variant="secondary" className="text-sm">
            {t("turnBasedCut.cutOrderHeading")}
          </Text>
          <ol
            aria-label={t("turnBasedCut.cutOrderHeading")}
            className="flex flex-wrap items-center gap-2"
          >
            {round.cuts.map((cut, index) => {
              const cutter = state.players.find((p) => p.userId === cut.userId);
              const item = round.items.find((i) => i.id === cut.itemId);
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
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-sm">
          {t(`between.boardHeading${verb}`)}
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
                format={packFormat}
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
