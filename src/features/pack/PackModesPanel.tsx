import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { ICON_BY_NAME } from "@/src/features/friends-rooms/mode-icons";
import {
  MODE_NAME_KEY,
  MODE_ICON,
} from "@/src/features/friends-rooms/room-mode-copy";
import {
  ROOM_MODE_BOUNDS,
  type AvailableMode,
} from "@/src/features/friends-rooms/room-types";

/**
 * The pack detail page's room-mode preview, shown before any room exists —
 * so a visitor can see whether this pack supports Voting/Claim/etc. before
 * committing to Create a room. Reuses the exact feasibility data (including
 * the `reason` strings) the room lobby's ModePicker gates on, so this panel
 * can never promise a mode the lobby then refuses.
 */
export function PackModesPanel({ modes }: { modes: AvailableMode[] }) {
  const t = useTranslations("room");

  if (modes.length === 0) return null;

  return (
    <div className="flex flex-col gap-[11px] rounded-[20px] border border-border bg-surface-card p-5">
      <Text className="text-[14.5px] font-bold">{t("packModes.heading")}</Text>
      <div className="flex flex-col gap-2">
        {modes.map((entry) => {
          const ModeIcon = ICON_BY_NAME[MODE_ICON[entry.mode]];
          return (
            <div
              key={entry.mode}
              className={cn(
                "flex items-center gap-2.5 rounded-[12px] border px-3 py-[11px]",
                entry.available
                  ? "border-border bg-background"
                  : "border-white/[0.06] bg-transparent opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 flex-none items-center justify-center rounded-[9px]",
                  entry.available
                    ? "bg-acc/[0.12] text-acc-hover"
                    : "bg-white/[0.05] text-foreground-tertiary",
                )}
              >
                {ModeIcon && <ModeIcon size={14} aria-hidden />}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <Text
                  className={cn(
                    "text-[13px] font-semibold",
                    !entry.available && "text-foreground-secondary",
                  )}
                >
                  {t(MODE_NAME_KEY[entry.mode])}
                </Text>
                <Text
                  variant={entry.available ? "tertiary" : "secondary"}
                  className="text-[11.5px]"
                >
                  {entry.available
                    ? t("modePicker.playerRange", {
                        min: ROOM_MODE_BOUNDS[entry.mode].minPlayers,
                        max: entry.maxPlayers,
                      })
                    : entry.reason}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
      <Text variant="tertiary" className="text-[11.5px] leading-[1.45] text-pretty">
        {t("packModes.caption")}
      </Text>
    </div>
  );
}
