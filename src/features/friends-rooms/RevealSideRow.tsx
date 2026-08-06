"use client";

import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { RoundMedia } from "./RoundMedia";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";
import type { RoomPlayerState, RoundSide } from "./room-types";

/**
 * One side of an nxn round on the BETWEEN-round screen, presented the way solo
 * play presents a versus round (`features/play/VersusRound`'s side panel): the
 * pool name as a quiet uppercase label, then the drawn items in an auto-fit
 * grid, each item's title centred directly beneath its own media.
 *
 * Deliberately NOT {@link RoundSideTile}. That component is a PICK TARGET — the
 * whole card is a button, its items sit in bordered sub-panels so you can tell
 * which title belongs to which video while choosing, and it carries a tally and
 * a hover lift. None of that applies once the round is closed, and reshaping it
 * to suit this screen would change the live board nobody asked to change.
 */
export function RevealSideRow({
  side,
  items,
  pickLabels,
  voters,
  outcome,
}: {
  side: RoundSide;
  /** The side's own drawn items, in draw order. */
  items: Item[];
  /** Guess-who's ANONYMOUS labels that picked this side — never people. */
  pickLabels?: { label: string; className: string }[];
  /** Who picked this side, NAMED and with their avatar. Voting and Spy, where
   * the round is over and there is nothing left to protect. */
  voters?: RoomPlayerState[];
  /**
   * How the round ENDED for this side. Voting's between board is the only
   * caller that has a verdict to draw: Guess-who and Spy rounds resolve to no
   * winner at all, so colouring a side there would invent one.
   */
  outcome?: "won" | "lost";
}) {
  return (
    <div
      role="group"
      aria-label={side.name}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-[20px] border p-4",
        outcome === "won"
          ? "border-success bg-success/[0.06] ring-1 ring-success/35"
          : outcome === "lost"
            ? "border-danger/70 bg-danger/[0.04]"
            : "border-border bg-surface-card",
      )}
    >
      <Text className="truncate text-[11.5px] font-bold tracking-[0.1em] text-foreground/45 uppercase">
        {side.name}
      </Text>

      {/* auto-fit rather than a fixed column count: nxn allows up to 8 items a
          side, and 8 equal columns squeeze every tile to a sliver. Below 720px
          (this codebase's established mobile threshold) auto-fit still fits
          2-up at ~110px, too cramped for a video's controls — one column
          instead. `!` is required to beat the inline grid-template-columns. */}
      <div
        // Capped rather than `1fr`, and therefore centred: an uncapped track
        // fills the row, so two items each took half of it and a side ended up
        // as two enormous tiles. Capped but left-aligned they sit against the
        // pool name's edge with the rest of the card empty, so the two rules
        // only make sense together.
        className="grid justify-center gap-3 max-[720px]:!grid-cols-1"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 240px))",
        }}
      >
        {items.map((item) => (
          <RevealItem key={item.id} item={item} />
        ))}
      </div>

      {/* Under the media, not beside the pool name. Up in the header it was a
          caption on a title; here it reads as what it is — the people (or the
          labels) this side collected, attached to the thing they picked.

          Two forms, one slot: `voters` are real people and get their faces,
          `pickLabels` are Guess-who's anonymous letters and must not. */}
      {voters && voters.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {voters.map((voter) => (
            <span
              key={voter.userId}
              className="flex items-center gap-1.5 rounded-full border border-border bg-white/[0.04] py-0.5 pe-2 ps-0.5 text-[11.5px] font-semibold text-foreground-secondary"
            >
              <UserAvatar
                username={voter.username}
                avatarKey={voter.avatarKey}
                tone
                className="h-[18px] w-[18px] flex-none rounded-full text-[8px]"
              />
              {voter.username}
            </span>
          ))}
        </span>
      )}

      {pickLabels && pickLabels.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {pickLabels.map((pick) => (
            <span
              key={pick.label}
              className={cn(
                "grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-[10.5px] font-extrabold",
                pick.className,
              )}
            >
              {pick.label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** Media band + centred caption — solo's item tile, minus the entrance
 * stagger (there is nothing being revealed one-by-one here). */
function RevealItem({ item }: { item: Item }) {
  return (
    <div className="flex min-w-0 flex-col gap-[9px]">
      <RoundMedia item={item} className="rounded-[11px]" />
      <Text className="text-center text-[12px] font-[650] text-pretty">
        {item.title}
      </Text>
    </div>
  );
}
