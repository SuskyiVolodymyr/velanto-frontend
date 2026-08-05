"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState } from "./room-types";

interface SpyRedactedTileProps {
  /** What to call it — "Redacted option" or "Redacted pool". */
  label: string;
  /** Accessible name for the control, by SLOT: "Pick the hidden option in slot 3". */
  actionLabel: string;
  /** The visible slot number, when the board numbers its slots. */
  slotLabel?: string;
  onPick: () => void;
  /** The viewer picked this one, blind. */
  mine?: boolean;
  /** Who else picked it — the crowd's shape, which is not hidden. */
  people?: RoomPlayerState[];
  tally?: { count: number; max: number };
}

/**
 * One option the viewer cannot read — the spy's half of the board.
 *
 * A placeholder, deliberately not an absence: the slot stays in place so the
 * spy knows how many options exist and can attribute other people's picks to
 * it. What it holds is all that is missing.
 *
 * It is still a real control. The spy MUST be able to pick blind — with two
 * options and one visible (1v1, nxn) a spy restricted to what they can read
 * would have no choice at all and would be identified by round two.
 */
export function SpyRedactedTile({
  label,
  actionLabel,
  slotLabel,
  onPick,
  mine = false,
  people = [],
  tally,
}: SpyRedactedTileProps) {
  const t = useTranslations("room");
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={actionLabel}
      aria-pressed={mine}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-card border text-start",
        "transition-transform duration-200 ease-signature motion-reduce:transition-none",
        "hover:-translate-y-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spy",
        mine ? "border-spy" : "border-spy/30",
      )}
    >
      <span
        aria-hidden
        className="relative grid aspect-video place-items-center bg-spy/[0.07]"
        style={{
          // Hatching, so a redacted slot reads as deliberately withheld rather
          // than as an image that failed to load.
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(168,85,247,.13) 0 7px, rgba(15,17,22,.9) 7px 14px)",
        }}
      >
        <span className="flex flex-col items-center gap-1.5 text-spy">
          <Lock size={20} aria-hidden />
          <span className="font-mono text-[9.5px] font-bold tracking-[0.1em]">
            {t("spy.redactedBadge")}
          </span>
        </span>
        {slotLabel && (
          <span className="absolute start-2 top-2 rounded-[6px] bg-background/70 px-[7px] py-0.5 font-mono text-[10px] font-bold tracking-[0.06em] text-foreground-secondary">
            {slotLabel}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-2 px-3 pt-[11px] pb-3">
        <span className="flex items-center gap-[7px]">
          <Text className="min-w-0 truncate text-[13.5px] font-semibold text-spy italic">
            {label}
          </Text>
          {mine && (
            <span className="ms-auto flex-none rounded-[8px] bg-spy px-[9px] py-[3px] text-[10px] font-bold tracking-[0.05em] text-background">
              {t("spy.yourBlindPick")}
            </span>
          )}
        </span>
        {tally && (
          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              <span
                className="block h-full rounded-full bg-spy transition-[width] duration-300 ease-signature motion-reduce:transition-none"
                style={{
                  width: `${tally.max > 0 ? Math.round((tally.count / tally.max) * 100) : 0}%`,
                }}
              />
            </span>
            <span className="font-mono text-[12px] font-bold tabular-nums text-foreground-secondary">
              {tally.count}
            </span>
          </span>
        )}
        {people.length > 0 && (
          <span className="flex">
            {people.map((person) => (
              <UserAvatar
                key={person.userId}
                username={person.username}
                avatarKey={person.avatarKey}
                className="-ms-1.5 h-6 w-6 rounded-full border-2 border-surface-card bg-surface-raised text-[9px] font-bold text-foreground"
              />
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
