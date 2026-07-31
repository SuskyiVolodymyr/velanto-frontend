"use client";

import { useTranslations } from "next-intl";
import { Crown, Vote } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { RoundChrome, type RoundPlayerStatus } from "./RoundChrome";
import { RoundItemTile } from "./RoundItemTile";
import type { RoomPlayerState, RoomState } from "./room-types";

interface VotingBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onVote: (optionId: string) => void;
}

/**
 * Voting's round board (Room Round.dc.html, voting arm): every option, a live
 * PUBLIC tally — this mode has no blind concept — and the tiebreak holder shown
 * before the round resolves, so the room knows whom a tie favours and can argue
 * accordingly. A vote is free to change until the round closes.
 */
export function VotingBoard({
  state,
  currentUserId,
  onVote,
}: VotingBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round?.optionIds) return null;

  const votes = round.votes ?? {};
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const present = state.players.filter((p) => p.connected);
  const myVote = currentUserId ? votes[currentUserId] : undefined;
  const priorityUserId = round.priorityUserId ?? null;
  const priorityPlayer = priorityUserId
    ? (playerById.get(priorityUserId) ?? null)
    : null;

  const votersFor = (optionId: string): RoomPlayerState[] =>
    Object.entries(votes)
      .filter(([, voted]) => voted === optionId)
      .map(([userId]) => playerById.get(userId))
      .filter((p): p is RoomPlayerState => p !== undefined);

  const counts = new Map(
    round.optionIds.map((id) => [id, votersFor(id).length] as const),
  );
  const maxCount = Math.max(0, ...counts.values());
  const leaders = [...counts.entries()].filter(
    ([, n]) => n === maxCount && n > 0,
  );
  const totalVotes = Object.keys(votes).length;
  // A tie only matters once it could actually decide something — one vote each
  // on two options with two people still to go is not news.
  const tied = leaders.length > 1 && totalVotes >= 2;

  const tally = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const status = (player: RoomPlayerState): RoundPlayerStatus => {
    const voted = votes[player.userId] !== undefined;
    return {
      label: voted ? t("board.voted") : t("board.deciding"),
      done: voted,
      priority: player.userId === priorityUserId,
    };
  };

  return (
    <RoundChrome
      state={state}
      question={t("voting.instruction")}
      progressNote={t("board.progressVotes", {
        count: totalVotes,
        total: present.length,
      })}
      call={{
        yours: myVote === undefined,
        icon: <Vote size={15} aria-hidden />,
        title: myVote ? t("board.voteLocked") : t("board.tapToVote"),
        hint: t("board.resolvesWhenAllVote"),
      }}
      status={status}
      asidePanel={
        tally.length > 0 ? (
          <section
            aria-label={t("board.liveTally")}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-[18px]"
          >
            <div className="flex items-baseline gap-[9px]">
              <Text as="h3" className="text-[15px] font-bold">
                {t("board.liveTally")}
              </Text>
              <Text variant="tertiary" className="ms-auto text-[11.5px]">
                {t("board.tallyHint")}
              </Text>
            </div>
            <ul className="flex flex-col gap-[11px]">
              {tally.map(([optionId, count]) => {
                const leading = count === maxCount;
                return (
                  <li key={optionId} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "min-w-0 truncate text-[13px] font-semibold",
                          leading
                            ? "text-foreground"
                            : "text-foreground-secondary",
                        )}
                      >
                        {itemsById.get(optionId)?.title ?? optionId}
                      </span>
                      <span className="ms-auto flex">
                        {votersFor(optionId).map((voter) => (
                          <UserAvatar
                            key={voter.userId}
                            username={voter.username}
                            avatarKey={voter.avatarKey}
                            className="-ms-1.5 h-[21px] w-[21px] rounded-full border-2 border-surface-card bg-surface-raised text-[8.5px] font-bold text-foreground"
                          />
                        ))}
                      </span>
                      <span
                        className={cn(
                          "min-w-4 text-end font-mono text-[12.5px] font-bold tabular-nums",
                          leading
                            ? "text-foreground"
                            : "text-foreground-secondary",
                        )}
                      >
                        {count}
                      </span>
                    </div>
                    <span className="block h-[7px] overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-[width] duration-300 ease-signature motion-reduce:transition-none",
                          leading ? "bg-acc" : "bg-white/20",
                        )}
                        style={{
                          width: `${maxCount > 0 ? Math.round((count / maxCount) * 100) : 0}%`,
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : undefined
      }
    >
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
        {round.optionIds.map((optionId) => {
          const item = itemsById.get(optionId);
          if (!item) return null;
          const count = counts.get(optionId) ?? 0;
          const mine = myVote === optionId;
          return (
            <RoundItemTile
              key={optionId}
              item={item}
              actionLabel={t("board.voteFor", { name: item.title })}
              onPick={() => onVote(optionId)}
              mine={mine}
              leading={count === maxCount && count > 0}
              badge={
                mine ? { label: t("board.yourVote"), tone: "acc" } : undefined
              }
              tally={{ count, max: maxCount }}
              // The viewer's own vote is already announced by the badge; the
              // avatars are for reading the ROOM.
              people={votersFor(optionId).filter(
                (p) => p.userId !== currentUserId,
              )}
            />
          );
        })}
      </div>

      {tied && priorityPlayer && (
        <div className="flex items-center gap-2.5 rounded-[13px] border border-score/[0.28] bg-score/[0.08] p-[12px_14px]">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-score text-background">
            <Crown size={15} fill="currentColor" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <Text className="text-[13px] font-bold text-score">
              {t("board.tieTitle", { name: priorityPlayer.username })}
            </Text>
            <Text variant="tertiary" className="text-[11.5px]">
              {t("board.tieBody")}
            </Text>
          </div>
        </div>
      )}
    </RoundChrome>
  );
}
