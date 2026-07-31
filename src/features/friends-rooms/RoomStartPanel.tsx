"use client";

import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export interface RoomStartState {
  isHost: boolean;
  /** Present players who have readied up, and how many are present at all. */
  ready: number;
  total: number;
  /** Whether the viewer themselves is ready — labels their own toggle. */
  meReady: boolean;
  /** The chosen mode's display name, or null while none is chosen. */
  modeName: string | null;
  /** How many players the chosen mode needs to run at all. */
  minPlayers: number;
}

/**
 * The lobby's start controls: how close the room is to ready, the host's Start,
 * and the viewer's own Ready toggle (Room Lobby.dc.html).
 *
 * Rendered twice — inline in the aside on desktop, and as a fixed bar on
 * phones, where the aside's third card is a long scroll away from the thumb.
 * Exactly one of the two is ever visible, so the duplicate controls can never
 * both be reached.
 */
export function RoomStartPanel({
  state,
  onStart,
  onToggleReady,
}: {
  state: RoomStartState;
  onStart: () => void;
  onToggleReady: () => void;
}) {
  const t = useTranslations("room");
  const { isHost, ready, total, meReady, modeName, minPlayers } = state;

  const allReady = total > 0 && ready === total;
  const enoughPlayers = total >= minPlayers;
  const canStart = isHost && allReady && enoughPlayers && modeName !== null;
  const percent = total > 0 ? Math.round((ready / total) * 100) : 0;

  const startLabel = !isHost
    ? t("lobby.waitingForHost")
    : modeName
      ? t("lobby.start", { mode: modeName })
      : t("lobby.startGeneric");

  const note = !isHost
    ? t("lobby.startNoteGuest")
    : modeName === null
      ? t("lobby.startNoteNoMode")
      : !enoughPlayers
        ? t("lobby.startNoteNeedsMore", { min: minPlayers })
        : allReady
          ? t("lobby.startNoteAllReady")
          : t("lobby.startNoteWaiting");

  const startButton = (
    <button
      type="button"
      disabled={!canStart}
      onClick={onStart}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-[13px] text-[14.5px] font-bold transition-colors",
        canStart
          ? "bg-acc text-background hover:bg-acc-hover"
          : "cursor-not-allowed bg-white/[0.06] text-foreground-tertiary",
      )}
    >
      <Play size={15} fill="currentColor" aria-hidden />
      {startLabel}
    </button>
  );

  const readyButton = (
    <button
      type="button"
      aria-pressed={meReady}
      onClick={onToggleReady}
      className={cn(
        "h-12 rounded-[13px] border px-[18px] text-sm font-semibold transition-colors",
        meReady
          ? "border-live/35 bg-live/[0.12] text-live"
          : "border-border-strong text-foreground hover:bg-white/[0.04]",
      )}
    >
      {meReady ? t("lobby.unready") : t("lobby.imReady")}
    </button>
  );

  return (
    <>
      <section
        aria-label={t("lobby.readyCount", { ready, total })}
        className="flex flex-col gap-[11px] rounded-card border border-border bg-surface-card p-[18px] max-[720px]:hidden"
      >
        <div className="flex items-center gap-2.5">
          <Text variant="secondary" className="text-[13px] font-semibold">
            {allReady
              ? t("lobby.everyoneReady")
              : t("lobby.waitingOn", { count: total - ready })}
          </Text>
          <Text
            className={cn(
              "ms-auto font-mono text-[12.5px] font-bold",
              allReady ? "text-live" : "text-foreground-secondary",
            )}
          >
            {t("lobby.readyCount", { ready, total })}
          </Text>
        </div>

        <div
          role="progressbar"
          aria-valuenow={ready}
          aria-valuemin={0}
          aria-valuemax={total}
          className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-signature",
              allReady ? "bg-live" : "bg-acc",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-[9px] pt-1">
          {startButton}
          {readyButton}
        </div>

        <Text variant="tertiary" className="text-[11.5px] leading-[1.45]">
          {note}
        </Text>
      </section>

      {/* Sits ABOVE the mobile bottom nav (fixed bottom-0 z-40, ~4.5rem,
          md:hidden) the same way RoomPresenceIndicator does, and below its
          z-index so the nav always wins if they ever meet. */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 hidden gap-[9px] border-t border-border bg-surface/95 p-3 backdrop-blur-md max-[720px]:flex">
        {readyButton}
        <div className="grid flex-1">{startButton}</div>
      </div>
    </>
  );
}
