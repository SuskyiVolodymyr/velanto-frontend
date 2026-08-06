"use client";

import { BetweenNextButton } from "./BetweenNextButton";
import { VsDivider } from "./VsDivider";
import type { RoomState } from "./room-types";

/**
 * The divider between an nxn round's two sides, with the advance control
 * riding on it.
 *
 * The VS already occupies a full row of its own between two tall cards — a
 * separate footer strip underneath them put the only button on the screen a
 * scroll below the thing it advances past. Sharing the row costs nothing: the
 * badge stays centred (equal flex on both sides of it, so the button's width
 * cannot pull it off-centre) and the button sits where every other screen in
 * the app puts its primary action.
 *
 * Only the `sides` arm uses this. The item grids either side of it have no
 * divider row to share.
 */
export function BetweenVsRow({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Balances the button so the badge lands on the row's true centre. */}
      <span aria-hidden className="flex-1" />
      <VsDivider />
      {/* The side rows either side of this are cards with their own 16px
          padding, so a button flush to the row's edge sits proud of the column
          the whole board reads down. */}
      <span className="flex flex-1 justify-end pe-4">
        <BetweenNextButton
          state={state}
          currentUserId={currentUserId}
          onNext={onNext}
        />
      </span>
    </div>
  );
}
