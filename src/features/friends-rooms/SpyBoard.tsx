"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { EyeOff, Search } from "lucide-react";
import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { RoundChrome, type RoundPlayerStatus } from "./RoundChrome";
import { RoundItemTile } from "./RoundItemTile";
import { RoundSideTile } from "./RoundSideTile";
import { SpyRedactedTile } from "./SpyRedactedTile";
import { VsDivider } from "./VsDivider";
import type { RoomPlayerState, RoomState } from "./room-types";

interface SpyBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onPick: (optionId: string) => void;
}

/**
 * Spy's round board: every option, every pick public under a real name — and,
 * for the one player who is the spy, half the board unreadable.
 *
 * NOTHING here decides what to hide. The server sends the spy a shorter `items`
 * array and an opaque token in each hidden slot of `optionIds`, so this reads
 * the round's SHAPE from `optionIds` and renders any option it cannot resolve
 * to an item as redacted. A client that got the redaction "wrong" could only
 * ever show less than it was given, never more.
 *
 * That also implements the mode's central rule for free: a slot hidden from the
 * spy stays hidden after somebody picks it, because the pick arrives keyed by
 * the same token the board is already drawing.
 */
export function SpyBoard({ state, currentUserId, onPick }: SpyBoardProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round?.optionIds) return null;

  const iAmSpy = state.iAmSpy === true;
  const picks = round.picks ?? {};
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const present = state.players.filter((p) => p.connected);
  const myPick = currentUserId ? picks[currentUserId]?.[0] : undefined;

  const pickersFor = (optionId: string): RoomPlayerState[] =>
    Object.entries(picks)
      .filter(([, chosen]) => chosen[0] === optionId)
      .map(([userId]) => playerById.get(userId))
      .filter((p): p is RoomPlayerState => p !== undefined);

  const counts = new Map(
    round.optionIds.map((id) => [id, pickersFor(id).length] as const),
  );
  const maxCount = Math.max(0, ...counts.values());
  const totalPicks = Object.keys(picks).length;
  const hiddenCount = round.optionIds.filter((id) => !itemsById.has(id)).length;

  /** What to call an option in a list — a real title, or the redaction. */
  const labelFor = (optionId: string) =>
    itemsById.get(optionId)?.title ?? t("spy.redacted");

  const isVersusPair =
    state.packFormat === "1v1" && round.optionIds.length === 2;

  const status = (player: RoomPlayerState): RoundPlayerStatus => {
    const chosen = picks[player.userId]?.[0];
    if (chosen === undefined) {
      return { label: t("board.deciding"), done: false };
    }
    // "Picked blind" is only ever true of the VIEWER, and only they are told:
    // it is derived from their own board, which nobody else receives.
    const blind =
      iAmSpy && player.userId === currentUserId && !itemsById.has(chosen);
    return { label: blind ? t("spy.pickedBlind") : t("spy.picked"), done: true };
  };

  const tally = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <RoundChrome
      state={state}
      currentUserId={currentUserId}
      question={t("spy.instruction")}
      progressNote={t("spy.progress", {
        count: totalPicks,
        total: present.length,
      })}
      call={{
        yours: myPick === undefined,
        icon: iAmSpy ? (
          <EyeOff size={15} aria-hidden />
        ) : (
          <Search size={15} aria-hidden />
        ),
        title: iAmSpy
          ? round.sides
            ? t("spy.spySideTitle")
            : t("spy.spyTitle", {
                count: hiddenCount,
                total: round.optionIds.length,
              })
          : t("spy.hunterTitle"),
        hint: iAmSpy ? t("spy.spyHint") : t("spy.hunterHint"),
      }}
      status={status}
      asidePanel={
        tally.length > 0 ? (
          <section
            aria-label={t("spy.picksHeading")}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-[18px]"
          >
            <div className="flex items-baseline gap-[9px]">
              <Text as="h3" className="text-[15px] font-bold">
                {t("spy.picksHeading")}
              </Text>
              <Text variant="tertiary" className="ms-auto text-[11.5px]">
                {t("spy.picksHint")}
              </Text>
            </div>
            <ul className="flex flex-col gap-[11px]">
              {tally.map(([optionId, count]) => {
                const hidden = !itemsById.has(optionId);
                return (
                  <li key={optionId} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "min-w-0 truncate text-[13px] font-semibold",
                          hidden
                            ? "text-spy italic"
                            : "text-foreground-secondary",
                        )}
                      >
                        {labelFor(optionId)}
                      </span>
                      <span className="ms-auto flex">
                        {pickersFor(optionId).map((picker) => (
                          <UserAvatar
                            key={picker.userId}
                            username={picker.username}
                            avatarKey={picker.avatarKey}
                            className="-ms-1.5 h-[21px] w-[21px] rounded-full border-2 border-surface-card bg-surface-raised text-[8.5px] font-bold text-foreground"
                          />
                        ))}
                      </span>
                      {/* UserAvatar is aria-hidden by design — it is a
                          decorative initial. In every other mode that is fine;
                          here the attribution IS the game ("public, under real
                          names"), so the names are spelled out for anyone not
                          reading the avatars. */}
                      <span className="sr-only">
                        {pickersFor(optionId)
                          .map((picker) => picker.username)
                          .join(", ")}
                      </span>
                      <span className="min-w-4 text-end font-mono text-[12.5px] font-bold tabular-nums">
                        {count}
                      </span>
                    </div>
                    <span className="block h-[7px] overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className={cn(
                          "block h-full rounded-full transition-[width] duration-300 ease-signature motion-reduce:transition-none",
                          hidden ? "bg-spy" : "bg-acc",
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
      {round.sides ? (
        // nxn: a pick names a SIDE. The side the spy cannot see arrives with
        // its pool NAME blanked and no items — hiding the contents while
        // leaving the name would give the round away on its own.
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {round.sides.map((side, index) => {
            const count = counts.get(side.id) ?? 0;
            const hidden = side.name === "";
            if (hidden) {
              return (
                <SpyRedactedTile
                  key={side.id}
                  label={t("spy.redactedPool")}
                  actionLabel={t("spy.pickHidden", { index: index + 1 })}
                  onPick={() => onPick(side.id)}
                  mine={myPick === side.id}
                  people={pickersFor(side.id)}
                  tally={{ count, max: maxCount }}
                />
              );
            }
            return (
              <RoundSideTile
                key={side.id}
                side={side}
                items={side.itemIds
                  .map((id) => itemsById.get(id))
                  .filter((item): item is Item => Boolean(item))}
                actionLabel={t("spy.pickFor", { name: side.name })}
                onPick={() => onPick(side.id)}
                mine={myPick === side.id}
                leading={count === maxCount && count > 0}
                tally={{ count, max: maxCount }}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            isVersusPair
              ? "grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              : "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]",
          )}
        >
          {round.optionIds.map((optionId, index) => {
            const item = itemsById.get(optionId);
            const count = counts.get(optionId) ?? 0;
            const mine = myPick === optionId;
            const tile = item ? (
              <RoundItemTile
                item={item}
                actionLabel={t("spy.pickFor", { name: item.title })}
                onPick={() => onPick(optionId)}
                mine={mine}
                leading={count === maxCount && count > 0}
                badge={
                  mine ? { label: t("spy.yourPick"), tone: "acc" } : undefined
                }
                tally={{ count, max: maxCount }}
                people={pickersFor(optionId).filter(
                  (p) => p.userId !== currentUserId,
                )}
              />
            ) : (
              <SpyRedactedTile
                label={t("spy.redacted")}
                // Numbered by SLOT, because that is the only handle the spy
                // has on an option they cannot read — and the number is what
                // they will be reasoning about out loud.
                actionLabel={t("spy.pickHidden", { index: index + 1 })}
                slotLabel={t("spy.slot", { index: index + 1 })}
                onPick={() => onPick(optionId)}
                mine={mine}
                people={pickersFor(optionId).filter(
                  (p) => p.userId !== currentUserId,
                )}
                tally={{ count, max: maxCount }}
              />
            );
            return isVersusPair ? (
              <Fragment key={optionId}>
                {index > 0 && <VsDivider />}
                {tile}
              </Fragment>
            ) : (
              <Fragment key={optionId}>{tile}</Fragment>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-[11px] rounded-[14px] border border-border bg-white/[0.03] px-[15px] py-[13px]">
        <span
          className={cn(
            "grid h-[26px] w-[26px] flex-none place-items-center rounded-[8px]",
            iAmSpy ? "bg-spy/15 text-spy" : "bg-acc/15 text-acc",
          )}
        >
          <EyeOff size={14} aria-hidden />
        </span>
        <Text variant="tertiary" className="text-[11.5px] leading-[1.5]">
          {iAmSpy ? t("spy.spyRule") : t("spy.hunterRule")}
        </Text>
      </div>
    </RoundChrome>
  );
}
