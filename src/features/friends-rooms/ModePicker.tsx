"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Check } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import {
  MODE_NAME_KEY,
  MODE_BLURB_KEY,
  MODE_ICON,
  MODE_RESULT_KIND,
} from "./room-mode-copy";
import { ICON_BY_NAME } from "./mode-icons";
import {
  ROOM_MODE_BOUNDS,
  type AvailableMode,
  type RoomMode,
} from "./room-types";

interface ModePickerProps {
  availableModes: AvailableMode[];
  selectedMode: RoomMode | null;
  isHost: boolean;
  onChange: (mode: RoomMode) => void;
}

/**
 * The lobby's mode grid (Room Lobby.dc.html). Host-only to click; a guest sees
 * the same cards, unclickable, so they can read what the host is deciding
 * between rather than staring at a single line of "the host is choosing".
 *
 * A mode with `available: false` (this pack can't feasibly run it — too-small
 * pools, too few rounds) renders dimmed with its one-line `reason`, never
 * hidden: the host should see every mode this format COULD offer, and why some
 * are out of reach.
 */
export function ModePicker({
  availableModes,
  selectedMode,
  isHost,
  onChange,
}: ModePickerProps) {
  const t = useTranslations("room");

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(252px,1fr))]">
      {availableModes.map((entry) => {
        const selected = entry.mode === selectedMode && entry.available;
        const bounds = ROOM_MODE_BOUNDS[entry.mode];
        const ModeIcon = ICON_BY_NAME[MODE_ICON[entry.mode]];
        const scored = MODE_RESULT_KIND[entry.mode] === "scored";
        return (
          <button
            key={entry.mode}
            type="button"
            // `aria-disabled`, not `disabled`: a `disabled` button is removed
            // from the tab order, so keyboard and voice-control users could
            // never reach the one thing an unavailable card exists to tell them
            // — `entry.reason`. The click is inert either way.
            aria-disabled={!entry.available || !isHost}
            aria-pressed={selected}
            onClick={() => {
              if (entry.available && isHost) onChange(entry.mode);
            }}
            className={cn(
              "flex flex-col gap-[9px] rounded-[16px] border p-[15px] text-start transition-colors",
              selected
                ? "border-acc/45 bg-acc/[0.08]"
                : "border-border bg-surface-card",
              !entry.available
                ? "cursor-not-allowed opacity-55"
                : isHost
                  ? "hover:border-border-strong"
                  : "cursor-default",
            )}
          >
            <div className="flex items-center gap-[9px]">
              <span
                className={cn(
                  "grid h-8 w-8 flex-none place-items-center rounded-[10px]",
                  scored
                    ? "bg-score/[0.14] text-score"
                    : selected
                      ? "bg-acc/[0.18] text-acc-hover"
                      : "bg-white/[0.06] text-foreground-secondary",
                )}
              >
                {ModeIcon && <ModeIcon size={17} aria-hidden />}
              </span>
              <Text
                className={cn(
                  "text-[14.5px] font-bold",
                  !entry.available && "text-foreground-tertiary",
                )}
              >
                {t(MODE_NAME_KEY[entry.mode])}
              </Text>
              {selected && (
                <span className="ms-auto grid h-5 w-5 flex-none place-items-center rounded-full bg-acc text-background">
                  <Check size={12} strokeWidth={3.2} aria-hidden />
                </span>
              )}
            </div>

            <Text
              variant="secondary"
              className="text-[12.5px] leading-[1.45] text-pretty"
            >
              {t(MODE_BLURB_KEY[entry.mode])}
            </Text>

            <div className="mt-auto flex flex-wrap items-center gap-[7px] pt-1">
              <span className="rounded-[7px] bg-white/[0.06] px-2 py-[3px] text-[11px] font-semibold text-foreground-secondary">
                {t("modePicker.playerRange", {
                  min: bounds.minPlayers,
                  // `entry.maxPlayers` is this PACK's cap, and it is 0 on a
                  // mode the pack cannot run — which read as "3-0 players".
                  // An unavailable card falls back to the mode's own ceiling,
                  // so it still says what the mode is for; the reason below
                  // says why it is out of reach.
                  max: entry.available ? entry.maxPlayers : bounds.maxPlayers,
                })}
              </span>
              <span
                className={cn(
                  "rounded-[7px] px-2 py-[3px] text-[11px] font-semibold",
                  scored
                    ? "bg-score/[0.14] text-score"
                    : "bg-white/[0.06] text-foreground-secondary",
                )}
              >
                {t(scored ? "lobby.resultScored" : "lobby.resultShared")}
              </span>
            </div>

            {!entry.available && entry.reason && (
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-score">
                <AlertCircle size={13} aria-hidden className="flex-none" />
                {entry.reason}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
