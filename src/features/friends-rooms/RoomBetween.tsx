"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type { RoomPlayerState, RoomState } from "./room-types";
import { BetweenNextButton } from "./BetweenNextButton";
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
  // Everything else, keeping each item's ORIGINAL board position: the number
  // on a card is where it sat in the round, so re-indexing the filtered list
  // would renumber the board.
  const others = round.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.id !== round.survivorItemId);

  return (
    <div className="flex flex-col gap-6">
      {/* The verdict centred over the card it describes, with the advance
          control on the same row. Down in a footer the button sat below a full
          board of media — on any real round you had to scroll past everything
          to reach the only thing you could do. */}
      <header className="flex flex-wrap items-center gap-3">
        {/* Balances the controls so the heading lands on the row's true
            centre. Hidden below the wrap point, where there is no second
            column to balance against. */}
        <span aria-hidden className="flex-1 max-[720px]:hidden" />
        <div className="flex flex-col items-center gap-1 text-center">
          <Text variant="tertiary" className="text-xs tracking-wide uppercase">
            {t(`between.survivorHeading${verb}`)}
          </Text>
          {/* A plain h2, not `<Text as="h2" variant="title">`: every Text
              variant sets a colour and cn() is a plain join, so a colour handed
              in from outside loses to the variant's own and this rendered
              white. Same reason RecapHeading hand-rolls its heading. */}
          <h2
            className={cn(
              "text-2xl font-bold tracking-[-0.01em]",
              // The odd one out is the GOOD outcome only on a save_one board.
              // Green on sacrifice_one celebrated the item that had just been
              // sacrificed.
              verb === "Save" ? "text-success" : "text-danger",
            )}
          >
            {t(`between.survivorNote${verb}`)}
          </h2>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <AutoNextCountdown
            key={state.autoNextAt ?? "none"}
            at={state.autoNextAt}
          />
          <BetweenNextButton
            state={state}
            currentUserId={currentUserId}
            onNext={onNext}
          />
        </div>
      </header>

      {/* The item the round settled on, centred and alone. It used to sit at
          the left edge above a grid that repeated it, so the one card the
          screen exists to show was the least prominent thing on it. */}
      {survivor && (
        <div className="mx-auto w-full max-w-[460px]">
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
        {/* One row, not a wrapping grid: the survivor above is the answer and
            these are what it beat, so they read as a single strip of evidence
            under it rather than as a second board. An elimination round draws
            at most eight, which is why the columns are counted rather than
            capped — and below the mobile threshold they fall to two, where a
            row of eight would be a row of slivers. */}
        <div
          className="grid gap-4 max-[720px]:!grid-cols-2"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, others.length)}, minmax(0, 1fr))`,
          }}
        >
          {others.map(({ item, index }) => (
            <RoomItemCard
              key={item.id}
              item={item}
              index={index}
              status="sacrificed"
              claimant={claimantByItem.get(item.id)}
              format={packFormat}
            />
          ))}
        </div>
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
 * isn't stuck"), not the main action — and deliberately outside the aria-live
 * region BetweenNextButton carries, since announcing a per-second tick would
 * drown out the "N / M ready" updates that actually matter.
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
