"use client";

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarKey: string | null;
  score: number;
}

const RANK_TONE = [
  "border-[var(--medal-gold)]/50 bg-[var(--medal-gold)]/10",
  "border-[var(--medal-silver)]/50 bg-[var(--medal-silver)]/10",
  "border-[var(--medal-bronze)]/50 bg-[var(--medal-bronze)]/10",
];

/**
 * A generic, mode-agnostic scored leaderboard + winner callout — the app's
 * first (design brief §3.6/§4.4). Deliberately takes only `{userId, username,
 * avatarKey, score}[]`, no mode-specific fields, so a future scored mode can
 * reuse it unmodified. Ties at first place are ALL marked winner — Guess-who's
 * own scoring never awards partial credit, so an exact-score tie is a genuine
 * shared win, not a display rounding artifact.
 */
export function RoomLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useTranslations("room");
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score;

  return (
    <ol className="flex flex-col gap-2">
      {sorted.map((entry, index) => {
        const isWinner = entry.score === topScore;
        return (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-tile border p-3",
              index < 3 ? RANK_TONE[index] : "border-border bg-surface-card",
            )}
          >
            <span className="w-6 flex-none text-center text-sm font-bold tabular-nums text-foreground-tertiary">
              {index + 1}
            </span>
            <UserAvatar
              username={entry.username}
              avatarKey={entry.avatarKey}
              size="sm"
            />
            <Text className="flex-1 truncate text-sm font-semibold">
              {entry.username}
            </Text>
            {isWinner && (
              <span className="flex items-center gap-1 text-xs font-semibold text-score">
                <Crown size={14} aria-hidden />
                {t("leaderboard.winner")}
              </span>
            )}
            <Text variant="secondary" className="text-sm font-bold tabular-nums">
              {t("leaderboard.points", { count: entry.score })}
            </Text>
          </li>
        );
      })}
    </ol>
  );
}
