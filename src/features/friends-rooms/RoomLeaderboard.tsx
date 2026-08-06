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

// The medal colours are registered Tailwind theme colours
// (`--color-medal-*` in globals.css), so use the generated utilities the way
// the solo result table does — an arbitrary `[var(--medal-gold)]` bypasses
// the token layer for no gain.
const RANK_TONE = [
  "border-medal-gold/50 bg-medal-gold/10",
  "border-medal-silver/50 bg-medal-silver/10",
  "border-medal-bronze/50 bg-medal-bronze/10",
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

  // COMPETITION rank (1, 1, 1, 4), not row position. Toned by row index, three
  // players tied on one point each got gold, silver and bronze — three
  // different verdicts on one identical score, and the medal colours flatly
  // contradicted the "Winner" crown beside them. Equal scores now share a
  // rank, and therefore a colour.
  const rankOf: number[] = [];
  sorted.forEach((entry, index) => {
    rankOf[index] =
      index > 0 && entry.score === sorted[index - 1].score
        ? rankOf[index - 1]
        : index + 1;
  });

  return (
    <ol className="flex flex-col gap-2">
      {sorted.map((entry, index) => {
        const isWinner = entry.score === topScore;
        const rank = rankOf[index];
        return (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-tile border p-3",
              rank <= 3 ? RANK_TONE[rank - 1] : "border-border bg-surface-card",
            )}
          >
            <span className="w-6 flex-none text-center text-sm font-bold tabular-nums text-foreground-tertiary">
              {rank}
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
            <Text
              variant="secondary"
              className="text-sm font-bold tabular-nums"
            >
              {t("leaderboard.points", { count: entry.score })}
            </Text>
          </li>
        );
      })}
    </ol>
  );
}
