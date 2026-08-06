"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { BoardCard, BoardRow } from "@/src/shared/components/BoardCard";
import { HeroCard } from "@/src/shared/components/HeroCard";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "./friends-rooms-client";

import type { RoomState } from "./room-types";

/** How many rows a press of "Show N more" adds — matches solo play's board. */
const PAGE = 5;

/**
 * The room result's aside — the same two blocks solo play's result screen puts
 * beside its recap: what to do next, then a board summarising the whole game.
 *
 * The two cards themselves come from `shared/` — this file is only the room's
 * copy and the room's data. Solo's board ranks items across every recorded play
 * of the PACK; this one ranks them across the single game these people just
 * had, read straight from `state.results` with no fetch.
 */

/** "Now what" — replay with the same pack, or go back to it. */
export function RoomResultAgainPanel({
  packId,
  className,
}: {
  packId: string;
  /** Ordering hook for the aside's `display:contents` collapse — see RoomResults. */
  className?: string;
}) {
  const t = useTranslations("room");
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function playAgain() {
    if (opening) return;
    setOpening(true);
    try {
      const room = await friendsRoomsClient.create(packId);
      // Left busy on purpose: we are navigating away, and flashing back to
      // idle before the route changes reads as a click that did nothing.
      router.push(`/rooms/${room.id}`);
    } catch {
      router.push(`/packs/${packId}`);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-[11px] rounded-[20px] border border-border bg-surface-card p-5",
        className,
      )}
    >
      <Text className="text-[14.5px] font-bold">
        {t("results.againCardTitle")}
      </Text>
      <Text variant="secondary" className="text-[12.5px] leading-[1.5]">
        {t("results.againCardNote")}
      </Text>
      <button
        type="button"
        onClick={playAgain}
        disabled={opening}
        className={buttonClassName("primary", "w-full")}
      >
        <RotateCcw size={15} aria-hidden />
        {t("results.playAgain")}
      </button>
      <Link
        href={`/packs/${packId}`}
        className={buttonClassName("outline", "w-full")}
      >
        {t("results.backToPack")}
      </Link>
    </div>
  );
}

/**
 * "Top picked" — every option the game put up, ranked by how much of the room
 * took it.
 *
 * The SAME card solo play ranks items in (`BoardCard`/`BoardRow` from
 * `shared/`), because it is the same claim at a different scale: solo's
 * denominator is every recorded play of the pack, this one's is the people who
 * were actually in the room. Read straight from `state.results` — no fetch.
 *
 * Returns null when there is nothing to rank, so a mode with no vote results
 * has no board rather than an empty card.
 */
/**
 * What the board's figure MEANS, per mode — the default ("how much of the room
 * went for each item") is true of every mode that resolves to a pick, and of
 * neither that resolves to an ordering.
 *
 * Shared-grid's figure is the share of BALLOTS that put an item first, which
 * the default only just covers; Relay's is a final position on one shared
 * board, which it gets flatly wrong — 80% there means "second of five", not
 * "four in five people took it", and nobody picked anything at all.
 */
const SUBTITLE_KEY: Partial<Record<NonNullable<RoomState["mode"]>, string>> = {
  shared_grid: "topPickedSubtitleBorda",
  relay: "topPickedSubtitleRelay",
};

export function RoomTopPickedBoard({
  state,
  currentUserId,
}: {
  state: RoomState;
  /** Marks the viewer's own picks, the way solo's board marks theirs. */
  currentUserId?: string | null;
}) {
  const t = useTranslations("room");
  const [shown, setShown] = useState(PAGE);

  const rows = pickedRows(state, currentUserId ?? null);
  if (rows.length === 0) return null;

  const visible = rows.slice(0, shown);
  const remaining = Math.min(PAGE, rows.length - visible.length);
  // Counted from the RESULTS, not from `rows` — those are merged per item, so
  // each one keeps only the first round it appeared in.
  const roundCount = state.results.filter((result) =>
    ["survivor", "vote", "reveal", "spy_round", "borda", "relay"].includes(
      result.kind,
    ),
  ).length;

  return (
    <BoardCard
      title={t("results.topPickedHeading")}
      note={t("results.topPickedNote", { count: roundCount })}
      subtitle={t(
        `results.${(state.mode && SUBTITLE_KEY[state.mode]) ?? "topPickedSubtitle"}`,
      )}
      listLabel={t("results.topPickedHeading")}
      remaining={remaining}
      showMoreLabel={t("results.boardShowMore", { count: remaining })}
      onShowMore={() => setShown((n) => n + PAGE)}
    >
      {visible.map((row, index) => (
        <li key={row.key}>
          <BoardRow
            rank={index + 1}
            name={row.title}
            mine={row.mine}
            mineLabel={t("results.topPickedYours")}
            headline={`${Math.round((row.picked / row.total) * 100)}%`}
            detail={`${row.picked}/${row.total}`}
            fill={(row.picked / row.total) * 100}
          />
        </li>
      ))}
    </BoardCard>
  );
}

interface PickedRow {
  key: string;
  roundIndex: number;
  title: string;
  picked: number;
  total: number;
  mine: boolean;
}

/**
 * Every option every round put up, with how many of the people present took it.
 *
 * Reads three result kinds because three modes reach this screen and all three
 * record the same underlying fact — who chose what — under different keys:
 * Voting keys its picks by userId, Guess-who by anonymous LABEL, Spy by userId
 * again. Which key is used is the modes' business; the count is not.
 *
 * The three pick-carrying kinds report the share of the room that took each
 * option. The two ranked kinds have no such share and are read differently —
 * Borda by each ballot's head, Relay by where an item finished — which is
 * noted at each arm. Every mode reaches the board; what the bar MEANS is the
 * mode's own.
 */
function pickedRows(state: RoomState, viewerId: string | null): PickedRow[] {
  const myLabel =
    state.players.find((p) => p.userId === viewerId)?.label ?? null;

  return (
    state.results
      .flatMap((round): PickedRow[] => {
        const titleById = new Map<string, string>(
          round.items.map((item) => [item.id, item.title]),
        );
        let optionIds: string[];
        // label/userId -> the id they took. Only the FIRST entry counts: a
        // rank_blind pick is a whole ordering, and only its head reads as a
        // choice — the same rule the label table applies.
        let picks: Record<string, string>;

        if (round.kind === "survivor") {
          // An elimination round records a CLAIM per player — the item they
          // saved, or the one they sacrificed. It is the same fact the other
          // modes record as a pick, under a different name, so the board can
          // rank it the same way. Without this arm the five shared-verdict
          // modes had no board at all.
          optionIds = round.items.map((item) => item.id);
          picks = round.claims;
        } else if (round.kind === "vote") {
          optionIds = round.optionIds;
          picks = round.votes;
        } else if (round.kind === "borda") {
          // A Borda ballot is a whole ordering, and its HEAD is the part that
          // reads as a choice — the same rule the label table applies to a
          // rank_blind pick. Ranking by aggregate score instead would be a
          // different statement in the same card: "what the room ranked
          // highest" rather than "what the room went for".
          optionIds = round.items.map((item) => item.id);
          picks = Object.fromEntries(
            Object.entries(round.ballots)
              .map(([userId, ballot]) => [userId, ballot[0]])
              .filter((entry): entry is [string, string] => Boolean(entry[1])),
          );
        } else if (round.kind === "relay") {
          // Relay has no per-player choice at all — the round is ONE shared
          // ordering built a placement at a time, so there is no "N of the
          // room took this" to report. What it does have is where each item
          // ended up, so the bar reads as height in the final order: top of a
          // five-item round is 5/5, bottom is 1/5.
          //
          // `mine` is still a real fact here — you placed some of these
          // yourself, and that is the one thing about the round that was
          // yours.
          const placedByMe = new Set(
            round.placements
              .filter((placement) => placement.userId === viewerId)
              .map((placement) => placement.itemId),
          );
          return round.order.map((itemId, position) => ({
            key: itemId,
            roundIndex: round.index,
            title: titleById.get(itemId) ?? itemId,
            picked: round.order.length - position,
            total: round.order.length,
            mine: placedByMe.has(itemId),
          }));
        } else if (round.kind === "reveal" || round.kind === "spy_round") {
          optionIds = (round.sides ?? round.items).map((option) => option.id);
          picks = Object.fromEntries(
            Object.entries(round.picks)
              .map(([who, ids]) => [who, ids[0]])
              .filter((entry): entry is [string, string] => Boolean(entry[1])),
          );
        } else {
          return [];
        }

        // The people who actually chose this round, not the roster: a player who
        // never picked is not a vote against every option.
        const total = Object.keys(picks).length;
        if (total === 0) return [];
        // Guess-who's picks are keyed by label, so the viewer's own row is found
        // through the label they held rather than their id.
        const mineKey = round.kind === "reveal" ? myLabel : viewerId;

        // This board ranks ITEMS, so an nxn option is expanded into the items
        // its pool drew: taking "Sci-fi" is taking everything in it that round.
        // Ranking the pools instead produced a two-row board of the pack's two
        // fixed pool names, which says nothing about the CONTENT anyone chose —
        // and it is the one place a room result can speak the same language as
        // solo play's board of the same name.
        // Narrowed once: `survivor` has no `sides` at all, and TS cannot see
        // through the union inside the closure below.
        const sides = "sides" in round ? (round.sides ?? []) : [];
        const itemsOf = (optionId: string): string[] =>
          sides.find((side) => side.id === optionId)?.itemIds ?? [optionId];

        return optionIds.flatMap((optionId) => {
          const picked = Object.values(picks).filter(
            (id) => id === optionId,
          ).length;
          const mine = mineKey !== null && picks[mineKey] === optionId;
          return itemsOf(optionId).map((itemId) => ({
            key: itemId,
            roundIndex: round.index,
            // An id that resolves to no item is an nxn pool sent without
            // `sides`. A poor label, but better than dropping the row and
            // under-reporting the game.
            title: titleById.get(itemId) ?? itemId,
            picked,
            total,
            mine,
          }));
        });
      })
      // Aggregated per ITEM across the whole game, not per round. A pack that
      // draws the same item into two rounds should rank it once, on both
      // rounds' evidence — which is what solo play's board of the same name
      // does, at pack scale instead of room scale.
      .reduce<PickedRow[]>((merged, row) => {
        const seen = merged.find((existing) => existing.key === row.key);
        if (!seen) return [...merged, { ...row }];
        seen.picked += row.picked;
        seen.total += row.total;
        // Yours if you took it in ANY round it turned up in.
        seen.mine = seen.mine || row.mine;
        return merged;
      }, [])
      .sort(
        (a, b) =>
          b.picked / b.total - a.picked / a.total ||
          a.title.localeCompare(b.title),
      )
  );
}

/**
 * The screen's opening statement — the SAME hero solo play opens with, which is
 * why it is `HeroCard` from `shared/` and not a lookalike built here. Only the
 * copy and the two figures differ.
 *
 * A results page that starts straight into round one never says the game is
 * over or how big it was.
 */
export function RoomResultHero({ state }: { state: RoomState }) {
  const t = useTranslations("room");
  return (
    <HeroCard
      eyebrow={t("results.heroEyebrow")}
      title={t("results.heroTitle")}
      note={t("results.heroNote")}
      stats={[
        { label: t("results.heroRounds"), value: state.results.length },
        { label: t("results.heroPlayers"), value: state.players.length },
      ]}
    />
  );
}
