"use client";

import { useTranslations } from "next-intl";
import { EyeOff } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { RoomPlayerState, RoomState, SpyRoundResult } from "./room-types";

/**
 * "Every pick, every round": one card per round, one column per player, every
 * choice in the open.
 *
 * The same evidence board Guess-who's own table is, with the masking inverted —
 * these columns are real people, because Spy hides the BOARD and not the names.
 * Deliberately a sibling rather than an extraction of `GuessWhoLabelTable`: that
 * one carries label tones, a mapping reveal and a rank_blind ordering cell, none
 * of which exist here, and the shared part is a plain grid. If a third mode
 * wants one, extract then, with three call sites to shape it.
 *
 * It renders during the accusation phase too, not just afterwards, because it
 * is what the accusation is READ FROM: one round attributes nothing, and it is
 * a player's run of choices that gives them away.
 */
export function SpyPickTable({
  state,
  /** Once revealed, mark the spy's column and their blind picks. */
  reveal,
}: {
  state: RoomState;
  reveal?: { spyUserId: string; hiddenByRound: string[][] };
}) {
  const t = useTranslations("room");
  const rounds = state.results.filter(
    (result): result is SpyRoundResult => result.kind === "spy_round",
  );
  if (rounds.length === 0) return null;

  const players = [...state.players].sort((a, b) => a.seat - b.seat);
  // A versus cell stacks both options, so its column needs a readable floor —
  // at `minmax(0, …)` a column can shrink until every title is an ellipsis,
  // which is worse than scrolling. nxn as well as 1v1: there the two options
  // are pools, but the cell is the same two-line stack.
  const versus = state.packFormat === "1v1" || state.packFormat === "nxn";
  // Whether choosing an item is a GOOD thing for it. On sacrifice_one it is
  // not — the pick is what gets sacrificed — so every verdict colour in a cell
  // flips with the format.
  const pickIsGood = state.packFormat !== "sacrifice_one";
  // One template, shared by the header and every round card: each round is its
  // own grid, so nothing else would keep their columns lined up.
  const gridTemplateColumns = `repeat(${players.length}, minmax(${
    state.packFormat === "nxn" ? "170px" : versus ? "140px" : "0"
  }, 1fr))`;

  return (
    <section
      aria-label={t("spy.reveal.historyHeading")}
      className="flex flex-col gap-[13px] rounded-card border border-border bg-surface-card p-5"
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
          {t("spy.reveal.historyHeading")}
        </Text>
        <Text variant="tertiary" className="text-[12.5px]">
          {t("spy.reveal.historyHint")}
        </Text>
      </div>

      {/* Scrolls itself rather than letting a wide roster push the page
          sideways — eight columns is a legal room. */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[320px] flex-col gap-2">
          <div className="grid gap-1.5 px-2" style={{ gridTemplateColumns }}>
            {players.map((player) => (
              <PlayerColumnHead
                key={player.userId}
                player={player}
                isSpy={reveal?.spyUserId === player.userId}
              />
            ))}
          </div>

          {rounds.map((round) => (
            <RoundRow
              key={round.index}
              round={round}
              players={players}
              pickIsGood={pickIsGood}
              gridTemplateColumns={gridTemplateColumns}
              spyUserId={reveal?.spyUserId}
              hidden={reveal?.hiddenByRound[round.index]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlayerColumnHead({
  player,
  isSpy,
}: {
  player: RoomPlayerState;
  isSpy: boolean;
}) {
  const t = useTranslations("room");
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-[11px] border px-1 py-2",
        isSpy ? "border-spy/40 bg-spy/[0.12]" : "border-border bg-background",
      )}
    >
      <UserAvatar
        username={player.username}
        avatarKey={player.avatarKey}
        tone
        className="h-7 w-7 flex-none rounded-full text-[10px]"
      />
      <span
        className={cn(
          "max-w-full truncate text-[11px] font-semibold",
          isSpy ? "text-spy" : "text-foreground-secondary",
        )}
      >
        {player.username}
      </span>
      {isSpy && (
        <span className="inline-flex items-center gap-1 rounded-full bg-spy/20 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-spy">
          <EyeOff size={9} aria-hidden />
          {t("spy.badge")}
        </span>
      )}
    </div>
  );
}

/** One round, as its own card: its name, then every player's choice under them. */
function RoundRow({
  round,
  players,
  pickIsGood,
  gridTemplateColumns,
  spyUserId,
  hidden,
}: {
  round: SpyRoundResult;
  players: RoomPlayerState[];
  /** False on sacrifice_one, where a pick is a loss — see the caller. */
  pickIsGood: boolean;
  /** The header's template, so every card's columns line up with it. */
  gridTemplateColumns: string;
  /** Set only after the reveal — nobody knows this during the accusation. */
  spyUserId?: string;
  /** The options this round hid from the spy. Reveal-only, same reason. */
  hidden?: string[];
}) {
  const t = useTranslations("room");
  const titleById = new Map<string, string>();
  for (const item of round.items) titleById.set(item.id, item.title);
  for (const side of round.sides ?? []) titleById.set(side.id, side.name);
  const hiddenSet = new Set(hidden ?? []);

  // nxn's options are pools, so the things on the board are `sides`; every
  // other format's are items. Either way a cell shows EVERY option, not just
  // the taken one — "took Dune" says nothing until you know what Dune was up
  // against, and on the spy's own column the untaken options are exactly where
  // the hidden ones are marked.
  const options = round.sides ?? round.items;
  const showAll = options.length > 1;
  // An nxn pick names the POOL, but a pool name alone ("Sci-fi") says nothing
  // about what was on the board that round — and this table is read to
  // recognise a player by WHAT they chose. The drawn items are that.
  const itemTitlesBySide = new Map(
    (round.sides ?? []).map((side) => [
      side.id,
      side.itemIds
        .map((id) => titleById.get(id))
        .filter((title): title is string => Boolean(title)),
    ]),
  );

  return (
    <div className="flex flex-col gap-1.5 rounded-[13px] border border-border bg-background/50 p-2">
      {/* The round's own name. A bare ordinal told you only where you were in
          the list; the name is what the round is actually remembered by. */}
      <span className="px-1 text-[11.5px] font-semibold text-foreground-secondary">
        {round.name || `${round.index + 1}`}
      </span>
      <div
        className="grid items-center gap-1.5"
        style={{ gridTemplateColumns }}
      >
        {players.map((player) => {
          const picked = round.picks[player.userId]?.[0];
          const isSpyCell = spyUserId === player.userId;

          if (showAll) {
            return (
              <span key={player.userId} className="flex flex-col gap-1">
                {options.map((option) => {
                  const id = option.id;
                  const taken = id === picked;
                  // A blind option is only knowable AFTER the reveal, which is
                  // the first time the hidden sets are public at all — and it
                  // is marked on the OPTION, not just on the pick, because
                  // what the spy could not see is the point.
                  const blind = isSpyCell && hiddenSet.has(id);
                  const drawn = itemTitlesBySide.get(id) ?? [];
                  return (
                    <span
                      key={id}
                      title={titleById.get(id) ?? id}
                      className={cn(
                        "flex flex-col gap-1 rounded-[9px] border px-2 py-[7px] text-center text-[12px] font-semibold",
                        // On sacrifice_one a pick is the item you got RID of,
                        // so the colours invert: the taken one is the loss and
                        // the untouched ones are what survived. Green on the
                        // pick there would celebrate the sacrifice.
                        taken === pickIsGood
                          ? "border-success/70 bg-success/[0.09] text-foreground"
                          : "border-danger/40 bg-danger/[0.05] text-foreground-tertiary",
                      )}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <span className="min-w-0 truncate">
                          {titleById.get(id) ?? id}
                        </span>
                        {blind && (
                          <>
                            <EyeOff
                              size={11}
                              aria-hidden
                              className="flex-none text-spy"
                            />
                            <span className="sr-only">
                              {t("spy.reveal.hiddenBadge")}
                            </span>
                          </>
                        )}
                      </span>
                      {/* The items under their pool, behind a hairline and
                          left-aligned: the pool name is the CHOICE and these
                          are what it contained, so they must not read as three
                          equal lines. Start-aligned because a stack of titles
                          is a list to scan, and a ragged centre is harder to
                          run an eye down than a ragged end. */}
                      {drawn.length > 0 && (
                        <span className="flex flex-col gap-0.5 border-t border-current/20 pt-1 text-start text-[10.5px] font-medium opacity-70">
                          {drawn.map((title, i) => (
                            <span
                              key={`${title}-${i}`}
                              className="flex items-center gap-1.5"
                            >
                              {/* A bullet, so two stacked titles read as a
                                  list of what the pool held rather than as one
                                  wrapped sentence. */}
                              <span
                                aria-hidden
                                className="h-1 w-1 flex-none rounded-full bg-current opacity-60"
                              />
                              <span className="min-w-0 truncate">{title}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  );
                })}
              </span>
            );
          }

          const blind =
            isSpyCell && picked !== undefined && hiddenSet.has(picked);
          return (
            <span
              key={player.userId}
              title={picked ? (titleById.get(picked) ?? picked) : undefined}
              className={cn(
                "flex items-center justify-center gap-1 rounded-[9px] border px-2 py-[9px] text-center text-[11.5px] font-semibold",
                isSpyCell
                  ? "border-spy/30 bg-spy/[0.08] text-spy"
                  : "border-border bg-white/[0.02] text-foreground-secondary",
              )}
            >
              <span className="min-w-0 truncate">
                {picked ? (titleById.get(picked) ?? picked) : "—"}
              </span>
              {blind && (
                <>
                  <EyeOff size={11} aria-hidden className="flex-none" />
                  <span className="sr-only">{t("spy.reveal.hiddenBadge")}</span>
                </>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
