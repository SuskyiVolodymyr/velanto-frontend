"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import type { RoomState } from "./room-types";

/**
 * The between-round advance control, for every mode's reveal screen.
 *
 * The count rides INSIDE the button. It used to sit as its own line on the
 * far side of the footer, which put the two halves of one thought — "three
 * more people have to press this" and the thing you press — at opposite ends
 * of the screen, and left every board repeating the same two-element row.
 *
 * The denominator is the whole seated roster, not the connected players: the
 * server's `advanceIfAllNext` waits on every seat, so a count against anything
 * smaller would sit at "4 / 4" while the room refused to move.
 */
export function BetweenNextButton({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  const t = useTranslations("room");
  const ready = state.players.filter((p) => p.next).length;
  const total = state.players.length;
  const mine = state.players.find((p) => p.userId === currentUserId)?.next;

  return (
    <>
      {/* The button's own accessible name stays the verb — "Next 1 / 4" is not
          a control anyone asked for. The tally is announced from here instead,
          where it can update without renaming the button under the cursor. */}
      <span aria-live="polite" className="sr-only">
        {t("between.ready", { count: ready, total })}
      </span>
      <Button disabled={Boolean(mine)} onClick={onNext}>
        {t("between.next")}
        <ArrowRight size={16} aria-hidden />
        {/* A hairline rule rather than a pill or a badge: the count is a
            secondary reading of the same control, not a second thing in it.
            A filled chip inside a filled button reads as a button-in-a-button;
            a rule just divides the label from its status. */}
        <span aria-hidden className="h-4 w-px bg-current/25" />
        <span
          aria-hidden
          className="text-[13px] font-semibold tabular-nums opacity-70"
        >
          {ready}/{total}
        </span>
      </Button>
    </>
  );
}
