"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Scissors } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { RoundChrome, type RoundPlayerStatus } from "./RoundChrome";
import { RoundItemTile } from "./RoundItemTile";
import type { RoomPlayerState, RoomState } from "./room-types";

interface TurnBasedCutBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onCut: (itemId: string) => void;
}

/**
 * Turn-based cut's board (Room Round.dc.html, cut arm): the full original board
 * with every cut item visibly struck out, and the remaining ones live ONLY on
 * the viewer's own turn. Deterministic — no votes, no ties — so the aside
 * carries the cut order and the log rather than a tally.
 */
export function TurnBasedCutBoard({
  state,
  currentUserId,
  onCut,
}: TurnBasedCutBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round?.remainingItemIds) return null;

  const remaining = new Set(round.remainingItemIds);
  const cuts = round.cuts ?? [];
  const cutterByItem = new Map(cuts.map((cut) => [cut.itemId, cut.userId]));
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const turnPlayer = round.turnUserId
    ? (playerById.get(round.turnUserId) ?? null)
    : null;
  const isMyTurn = round.turnUserId === currentUserId;

  const status = (player: RoomPlayerState): RoundPlayerStatus => {
    const acted = cuts.some((cut) => cut.userId === player.userId);
    const active = player.userId === round.turnUserId;
    return {
      label: active
        ? t("board.cuttingNow")
        : acted
          ? t("board.cut")
          : t("board.waiting"),
      done: acted && !active,
      active,
    };
  };

  return (
    <RoundChrome
      state={state}
      question={t("turnBasedCut.instruction")}
      progressNote={t("board.progressLeft", { count: remaining.size })}
      call={{
        yours: isMyTurn,
        icon: isMyTurn ? (
          <Scissors size={15} aria-hidden />
        ) : (
          <ArrowRight size={15} aria-hidden />
        ),
        title: isMyTurn
          ? t("turnIndicator.yourTurn")
          : t("turnIndicator.waitingFor", {
              name: turnPlayer?.username ?? "",
            }),
        hint: isMyTurn ? t("board.noTakebacks") : undefined,
      }}
      status={status}
      asidePanel={
        <section
          aria-label={t("board.cutSoFar")}
          className="flex flex-col gap-[11px] rounded-card border border-border bg-surface-card p-[18px]"
        >
          <Text as="h3" className="text-[15px] font-bold">
            {t("board.cutSoFar")}
          </Text>
          {cuts.length === 0 ? (
            <Text variant="tertiary" className="py-3.5 text-center text-xs">
              {t("board.cutEmpty", { name: turnPlayer?.username ?? "" })}
            </Text>
          ) : (
            <ul className="flex flex-col gap-[7px]">
              {cuts.map((cut, i) => {
                const cutter = playerById.get(cut.userId);
                return (
                  <li
                    key={`${cut.userId}-${cut.itemId}-${i}`}
                    className="flex items-center gap-2.5 rounded-[11px] border border-border bg-background p-[9px_11px]"
                  >
                    {cutter && (
                      <UserAvatar
                        username={cutter.username}
                        avatarKey={cutter.avatarKey}
                        className="h-6 w-6 flex-none rounded-full bg-surface-raised text-[9.5px] font-bold text-foreground"
                      />
                    )}
                    <span className="text-[12.5px] text-foreground-secondary">
                      {t("turnBasedCut.cutVerb")}
                    </span>
                    <span className="truncate text-[12.5px] font-semibold text-foreground/75 line-through">
                      {itemsById.get(cut.itemId)?.title ?? cut.itemId}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      }
    >
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
        {round.items.map((item) => {
          const alive = remaining.has(item.id);
          const cutter = cutterByItem.get(item.id);
          return (
            <RoundItemTile
              key={item.id}
              item={item}
              actionLabel={t("board.cutItem", { name: item.title })}
              onPick={alive && isMyTurn ? () => onCut(item.id) : undefined}
              spent={!alive}
              badge={
                alive
                  ? undefined
                  : { label: t("board.cutBadge"), tone: "danger" }
              }
              people={
                cutter && playerById.has(cutter)
                  ? [playerById.get(cutter)!]
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Who cuts, in order — the mock's own strip. Deterministic turn order is
          this mode's whole point, so it is worth showing before your turn
          arrives rather than only announcing it when it does. */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[15px] border border-border bg-surface-card p-[13px_15px]">
        <Text
          variant="tertiary"
          className="text-xs font-bold tracking-[0.1em] uppercase"
        >
          {t("turnBasedCut.cutOrderHeading")}
        </Text>
        <ul className="flex flex-wrap items-center gap-[7px]">
          {state.players.map((player) => {
            const active = player.userId === round.turnUserId;
            const acted = cuts.some((cut) => cut.userId === player.userId);
            return (
              <li
                key={player.userId}
                className={cn(
                  "flex items-center gap-[7px] rounded-full border py-[5px] ps-[5px] pe-3 text-xs font-semibold",
                  active
                    ? "border-acc/45 bg-acc/[0.12] text-foreground"
                    : acted
                      ? "border-border text-foreground-tertiary/70"
                      : "border-border text-foreground-secondary",
                )}
              >
                <UserAvatar
                  username={player.username}
                  avatarKey={player.avatarKey}
                  className="h-6 w-6 flex-none rounded-full bg-surface-raised text-[9.5px] font-bold text-foreground"
                />
                {player.username}
              </li>
            );
          })}
        </ul>
      </div>
    </RoundChrome>
  );
}
