"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { labelTone } from "./guess-who-labels";
import type { RoomState } from "./room-types";

/**
 * "What each label picked" (Guess Who Results.dc.html): one column per
 * anonymous label, one row per round, every pick in the open.
 *
 * This is the whole evidence base of the mode — a single round gives nobody
 * away, because two people often pick the same thing; it is the shape of a
 * whole column that is recognisable. So the table is what the guessing screen
 * is read FROM, not a summary shown afterwards.
 */
export function GuessWhoLabelTable({
  state,
  /** Once revealed, name each column's real player under its letter. */
  revealed = false,
}: {
  state: RoomState;
  revealed?: boolean;
}) {
  const t = useTranslations("room");
  const reveals = state.results.filter((r) => r.kind === "reveal");
  const labels = [
    ...new Set(reveals.flatMap((r) => Object.keys(r.picks))),
  ].sort();
  if (labels.length === 0) return null;

  const usernameById = new Map(
    state.players.map((p) => [p.userId, p.username]),
  );
  // Narrowed: the public endgame is a union now that Spy has its own reveal,
  // and this table is Guess-who's alone.
  const endgame =
    state.endgame?.kind === "identity_reveal" ? state.endgame : null;
  const mapping = endgame?.mapping ?? {};
  // rank_blind's pick is a whole ordering, which changes both what a cell
  // holds and how much room it needs.
  const ranked = state.packFormat === "rank_blind";
  // A versus cell stacks BOTH options (see RoundRow), so it needs the same
  // kind of readable floor a ranked cell does — at `minmax(0, …)` a column can
  // shrink until every title is an ellipsis, which is worse than scrolling.
  // nxn as well as 1v1: there the two options are pools, but the cell is the
  // same two-line stack.
  const versus = state.packFormat === "1v1" || state.packFormat === "nxn";
  // Whether choosing an item is a GOOD thing for it. On sacrifice_one it is
  // not — the pick is what gets sacrificed — so every verdict colour in a cell
  // flips with the format.
  const pickIsGood = state.packFormat !== "sacrifice_one";
  // One template, shared by the header and every row card: each row is its own
  // grid now, so nothing else would keep their columns lined up.
  const gridTemplateColumns = `repeat(${labels.length}, minmax(${
    ranked
      ? "150px"
      : state.packFormat === "nxn"
        ? "170px"
        : versus
          ? "140px"
          : "0"
  }, 1fr))`;

  return (
    <section
      aria-label={t("guessWho.trajectoryHeading")}
      className="flex flex-col gap-[13px] rounded-[20px] border border-border bg-surface-card p-5"
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
          {t("guessWho.trajectoryHeading")}
        </Text>
        <Text variant="tertiary" className="text-[12.5px]">
          {t("guessWho.trajectoryHint", { count: reveals.length })}
        </Text>
      </div>

      <div className="overflow-x-auto">
        {/* Each round is its own bordered card, headed by its own name, rather
            than a band of loose cells in one big grid — a row reads as one
            thing you can follow across, and it has somewhere to put the round
            name that a `display: contents` fragment never did.

            The cost is one grid per row, which is why the column template is
            hoisted and shared: nothing else lines the cards up with the header
            or with each other.

            A ranked cell holds a whole ordering and a 1v1 cell holds both
            contenders, so those columns get a readable floor and this wrapper
            scrolls sideways instead — at `minmax(0, …)` a column can shrink
            until every title is an ellipsis. */}
        <div className="flex min-w-[320px] flex-col gap-2">
          <div className="grid gap-1.5 px-2" style={{ gridTemplateColumns }}>
            {labels.map((label) => {
              const tone = labelTone(labels, label);
              const who = revealed ? usernameById.get(mapping[label]) : null;
              return (
                <div
                  key={label}
                  className="flex flex-col items-center gap-[5px] rounded-[11px] border border-border bg-background px-1 py-2"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 flex-none place-items-center rounded-[10px] text-sm font-extrabold",
                      tone.chip,
                    )}
                  >
                    {label}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-foreground-secondary">
                    {who ?? t("guessWho.stillAnonymous")}
                  </span>
                </div>
              );
            })}
          </div>

          {reveals.map((round) => (
            <RoundRow
              key={round.index}
              index={round.index}
              labels={labels}
              round={round}
              ranked={ranked}
              pickIsGood={pickIsGood}
              gridTemplateColumns={gridTemplateColumns}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-control border border-border bg-white/[0.04] p-[11px_13px]">
        <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-chip bg-acc/[0.14] text-acc-hover">
          <Info size={14} aria-hidden />
        </span>
        <Text variant="tertiary" className="text-xs leading-[1.45] text-pretty">
          {t("guessWho.columnHint")}
        </Text>
      </div>
    </section>
  );
}

/** One round, as its own card: the round number, then its pick under every label. */
function RoundRow({
  index,
  labels,
  round,
  ranked,
  pickIsGood,
  gridTemplateColumns,
}: {
  index: number;
  labels: string[];
  round: Extract<RoomState["results"][number], { kind: "reveal" }>;
  /** rank_blind: a pick is a whole ordering rather than one choice. */
  ranked: boolean;
  /** False on sacrifice_one, where a pick is a loss — see the caller. */
  pickIsGood: boolean;
  /** The header's template, so every card's columns line up with it. */
  gridTemplateColumns: string;
}) {
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const sidesById = new Map((round.sides ?? []).map((side) => [side.id, side]));
  return (
    <div className="flex flex-col gap-1.5 rounded-[13px] border border-border bg-background/50 p-2">
      {/* The round's real name, not a bare ordinal in a column of its own. A
          number told you only where you were in the list; the name is what the
          author called the round, and it is what someone reading a column
          actually remembers the round BY. */}
      <span className="px-1 text-[11.5px] font-semibold text-foreground-secondary">
        {round.name || `${index + 1}`}
      </span>
      <div
        className="grid items-center gap-1.5"
        style={{ gridTemplateColumns }}
      >
        {labels.map((label) => {
          const picks = round.picks[label] ?? [];
          const tone = labelTone(labels, label);
          // A rank_blind round's "pick" is a whole ordering; its FIRST entry is
          // the one that reads as a choice, and the rest would make the cell
          // unreadable.
          const pickedId = picks[0];
          const side = pickedId ? sidesById.get(pickedId) : undefined;

          // rank_blind: the pick IS an ordering, so the cell is the whole
          // ranking. Showing only its first entry threw away nearly everything
          // the round revealed — and this table is precisely what the guessing
          // screen is read from.
          if (ranked) {
            return (
              <ol
                key={label}
                className={cn(
                  "flex flex-col gap-1 rounded-[9px] px-1.5 py-2",
                  tone.cell,
                )}
              >
                {picks.map((id, position) => {
                  const title = itemsById.get(id)?.title ?? id;
                  return (
                    <li
                      key={`${id}-${position}`}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        aria-hidden
                        className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[6px] bg-white/[0.08] font-mono text-[10px] font-bold tabular-nums text-foreground-tertiary"
                      >
                        {position + 1}
                      </span>
                      {/* A block, not a flex child: text as a direct flex item
                        will not shrink, so a long title would spill over the
                        column instead of ellipsising. */}
                      <span
                        title={title}
                        className="min-w-0 flex-1 truncate text-start text-[11.5px] font-semibold text-foreground-secondary"
                      >
                        {title}
                      </span>
                    </li>
                  );
                })}
              </ol>
            );
          }

          // A two-option round shows BOTH sides of the matchup, always in the
          // round's own order, with the taken one green and the passed one red.
          // Printing only the pick threw away half the round: "took Dune" means
          // nothing until you know what Dune beat, and with the order held
          // steady down the column the colour alone reads as the choice.
          //
          // `sides` first, so an nxn cell names the POOLS rather than the four
          // items they drew — an nxn pick IS a pool, and the items are context
          // the round board already showed.
          //
          // EVERY option, not just two: an elimination round is a slate, and
          // "took Dune" says nothing until you know what Dune was up against.
          // The colour carries the choice, so the order stays the round's own
          // and a column can be read straight down.
          const versusOptions: {
            id: string;
            title: string;
            items: string[];
          }[] = round.sides
            ? round.sides.map((s) => ({
                id: s.id,
                title: s.name,
                // An nxn pick names the POOL, but a pool name alone ("Sci-fi")
                // says nothing about what was actually on the board that
                // round — and this table is read to recognise a player by
                // WHAT they chose. The drawn items are that.
                items: s.itemIds
                  .map((id) => itemsById.get(id)?.title)
                  .filter((title): title is string => Boolean(title)),
              }))
            : round.items.map((i) => ({ id: i.id, title: i.title, items: [] }));
          if (versusOptions.length > 1) {
            return (
              <span key={label} className="flex flex-col gap-1">
                {versusOptions.map((option) => {
                  const taken = option.id === pickedId;
                  return (
                    <span
                      key={option.id}
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
                      {/* The tooltip belongs on the element that TRUNCATES,
                          not on the cell around it: on the cell it also fired
                          over the item list below, captioning an item with
                          the pool's name. */}
                      <span className="truncate" title={option.title}>
                        {option.title}
                      </span>
                      {/* The items under their pool, behind a hairline. The
                          pool name is the CHOICE and the items are what it
                          contained — run together they read as a three-line
                          list of equals, and the cell stops saying what was
                          picked. */}
                      {option.items.length > 0 && (
                        <span className="flex flex-col gap-0.5 border-t border-current/20 pt-1 text-start text-[10.5px] font-medium opacity-70">
                          {option.items.map((title, i) => (
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

          // nxn with MORE than two pools — the versus branch above already
          // handled the two-pool case, which is every nxn round the create
          // form can currently produce. Kept because the pick names a POOL and
          // the items it drew are what that choice meant on the board; a pool
          // name on its own tells you nothing about what was in front of the
          // player.
          if (side) {
            const titles = side.itemIds
              .map((id) => itemsById.get(id)?.title)
              .filter((title): title is string => Boolean(title));
            return (
              <span
                key={label}
                className={cn(
                  "flex flex-col gap-1 rounded-[9px] px-2 py-[9px] text-center",
                  tone.cell,
                )}
              >
                <span
                  title={side.name}
                  className="truncate text-[12.5px] font-bold text-foreground"
                >
                  {side.name}
                </span>
                {titles.map((title, i) => (
                  <span
                    key={`${side.id}-${i}`}
                    title={title}
                    className="truncate text-[11.5px] font-medium text-foreground-tertiary"
                  >
                    {title}
                  </span>
                ))}
              </span>
            );
          }

          const title = pickedId
            ? (itemsById.get(pickedId)?.title ?? pickedId)
            : "";
          return (
            // A plain block, not a flex row: `truncate` hides overflow on the
            // CONTAINER, and text inside a flex container is a flex item that
            // will not shrink — so a long title spilled out of both sides of its
            // column and over its neighbours instead of ellipsising. The full
            // name stays reachable on hover, since truncation eats the end of it
            // and a column IS what you are reading.
            //
            // The nxn branch above CAN use flex, because there every line is its
            // own block-level child with its own `truncate` — the thing that
            // fails is text as a direct flex item.
            <span
              key={label}
              title={title || undefined}
              className={cn(
                "truncate rounded-[9px] px-2 py-[9px] text-center text-[12.5px] font-semibold text-foreground-secondary",
                tone.cell,
              )}
            >
              {title || "—"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
