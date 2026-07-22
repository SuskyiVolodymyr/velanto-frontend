import { Text } from "@/src/shared/components/Text";
import { BackButton } from "@/src/shared/components/BackButton";
import { cn } from "@/src/shared/lib/cn";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";

export interface PlayHeaderProps {
  /** The pack being played — where "Back" returns to. */
  packId: string;
  title: string;
}

/**
 * The top row of every play screen: "← Back" on the left, the pack's title
 * centred beside it.
 *
 * Format-agnostic on purpose. Once a round is on screen, nothing in the play
 * flow says which pack you are in — the round heading is the round's name
 * ("Round 1", a pool name, "Which do you prefer?"), so a player arriving from a
 * shared link had no on-page answer to "what am I playing?" without going back.
 *
 * This is the page's `h1`; the round headings inside PlayScreen /
 * RankPlayScreen / HeadToHeadPlayScreen are `h2`s beneath it.
 *
 * Two layouts, because a phone has no room to put a pack title beside anything:
 *
 * - **`sm` and up** — one row. The three-column grid (`1fr auto 1fr`) centres
 *   the title against the CONTENT box rather than against the space the back
 *   button leaves over; the empty third column is the counterweight, and
 *   dropping it drifts the title right by half the button's width. A title too
 *   long for the row truncates, so the row can't grow and push the game down.
 * - **below `sm`** — stacked. The title moves under the back button and WRAPS
 *   instead of truncating: on a 375px viewport the single-row version clipped
 *   most real titles ("Rank Blind: Anime Ope…"), which is worse than spending a
 *   second line on it.
 */
export function PlayHeader({ packId, title }: PlayHeaderProps) {
  return (
    <div
      className={cn(
        PACK_CONTAINER,
        "pt-6 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3",
      )}
    >
      <div className="sm:justify-self-start">
        <BackButton href={`/packs/${packId}`} />
      </div>
      <Text
        as="h1"
        variant="title"
        // `sm:min-w-0` is what lets `sm:truncate` work at all inside a grid
        // item: without it the column's automatic minimum size is its content,
        // so a long title widens the grid instead of clipping.
        className="mt-3 text-balance text-center text-xl sm:mt-0 sm:min-w-0 sm:truncate sm:text-2xl"
      >
        {title}
      </Text>
      {/* Counterweight for column 1 — see the grid note above. */}
      <div aria-hidden className="hidden sm:block" />
    </div>
  );
}
