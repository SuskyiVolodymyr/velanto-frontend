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
        {/* A ranked cell holds a whole ordering, not one title, so its column
            gets a readable floor and the wrapper scrolls sideways instead —
            `minmax(0, …)` lets a column shrink to nothing, which turns every
            row of a five-item ranking into an ellipsis. */}
        <div
          className="grid min-w-[320px] gap-1.5"
          style={{
            gridTemplateColumns: `auto repeat(${labels.length}, minmax(${
              ranked ? "150px" : "0"
            }, 1fr))`,
          }}
        >
          <span className="px-1 py-1.5 text-[11px] font-bold tracking-[0.1em] text-foreground-tertiary uppercase">
            {t("guessWho.roundColumn")}
          </span>
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

          {reveals.map((round) => (
            <FragmentRow
              key={round.index}
              index={round.index}
              labels={labels}
              round={round}
              ranked={ranked}
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

/** One round's row: its number, then that round's pick under every label. */
function FragmentRow({
  index,
  labels,
  round,
  ranked,
}: {
  index: number;
  labels: string[];
  round: Extract<RoomState["results"][number], { kind: "reveal" }>;
  /** rank_blind: a pick is a whole ordering rather than one choice. */
  ranked: boolean;
}) {
  const itemsById = new Map(round.items.map((item) => [item.id, item]));
  const sidesById = new Map((round.sides ?? []).map((side) => [side.id, side]));
  return (
    <>
      <span className="grid place-items-center px-1.5 font-mono text-[11.5px] font-semibold text-foreground-tertiary">
        {index + 1}
      </span>
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

        // nxn: the pick named a POOL. Its name is the choice, and the items it
        // drew are what that choice actually meant on the board — a pool name
        // on its own tells you nothing about what was in front of the player.
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
    </>
  );
}
