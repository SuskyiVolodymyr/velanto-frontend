"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { MODE_NAME_KEY, MODE_BLURB_KEY } from "./room-mode-copy";
import { ROOM_MODE_BOUNDS, type AvailableMode, type RoomMode } from "./room-types";

interface ModePickerProps {
  availableModes: AvailableMode[];
  selectedMode: RoomMode | null;
  isHost: boolean;
  onChange: (mode: RoomMode) => void;
}

/**
 * The lobby's mode picker (design brief §3.1/§4.2). Host-only to click; guests
 * see a read-only summary of whichever mode is (or isn't yet) chosen. A mode
 * with `available: false` (this pack can't feasibly run it — too-small pools,
 * too few rounds) renders disabled with its one-line `reason`, never hidden —
 * the host should see every mode this format COULD offer, and why some are
 * currently out of reach.
 */
export function ModePicker({
  availableModes,
  selectedMode,
  isHost,
  onChange,
}: ModePickerProps) {
  const t = useTranslations("room");

  if (!isHost) {
    const chosen = availableModes.find((m) => m.mode === selectedMode);
    return (
      <section aria-label={t("modePicker.heading")} className="flex flex-col gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("modePicker.heading")}
        </Text>
        {chosen ? (
          <div className="flex flex-col gap-1 rounded-tile border border-acc/40 bg-acc/[0.06] p-4">
            <Text className="text-sm font-semibold">
              {t(MODE_NAME_KEY[chosen.mode])}
            </Text>
            <Text variant="secondary" className="text-xs">
              {t(MODE_BLURB_KEY[chosen.mode])}
            </Text>
          </div>
        ) : (
          <Text variant="secondary" className="text-sm">
            {t("modePicker.hostIsChoosing")}
          </Text>
        )}
      </section>
    );
  }

  return (
    <section aria-label={t("modePicker.heading")} className="flex flex-col gap-3">
      <Text variant="tertiary" className="text-xs uppercase tracking-wide">
        {t("modePicker.heading")}
      </Text>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {availableModes.map((entry) => {
          const selected = entry.mode === selectedMode;
          const bounds = ROOM_MODE_BOUNDS[entry.mode];
          return (
            <button
              key={entry.mode}
              type="button"
              disabled={!entry.available}
              aria-pressed={selected}
              onClick={() => onChange(entry.mode)}
              className={cn(
                "flex flex-col gap-2 rounded-card border-[1.5px] p-4 text-start transition-colors",
                selected
                  ? "border-acc bg-acc/[0.08] ring-[3px] ring-acc/20"
                  : entry.available
                    ? "border-border bg-surface hover:border-border-strong"
                    : "cursor-not-allowed border-border bg-surface/40 opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Text className="text-sm font-semibold">
                  {t(MODE_NAME_KEY[entry.mode])}
                </Text>
                {selected ? (
                  <Check size={16} aria-hidden className="text-acc" />
                ) : (
                  <Circle size={14} aria-hidden className="text-foreground-tertiary" />
                )}
              </div>
              <Text variant="secondary" className="text-xs">
                {t(MODE_BLURB_KEY[entry.mode])}
              </Text>
              <Text variant="tertiary" className="text-[11px]">
                {entry.available
                  ? t("modePicker.playerRange", {
                      min: bounds.minPlayers,
                      max: entry.maxPlayers,
                    })
                  : entry.reason}
              </Text>
            </button>
          );
        })}
      </div>
    </section>
  );
}
