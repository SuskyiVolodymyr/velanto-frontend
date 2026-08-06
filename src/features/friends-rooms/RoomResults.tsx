"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { Item, Pack } from "@/src/shared/types/pack";
import type {
  BordaRoundResult,
  RelayRoundResult,
  RevealRoundResult,
  RoomPlayerState,
  RoomState,
  SurvivorRoundResult,
  VoteRoundResult,
} from "./room-types";
import {
  RoomResultAgainPanel,
  RoomResultHero,
  RoomTopPickedBoard,
} from "./RoomResultAside";

/**
 * The end screen: one block per round, in order, each rendered per its
 * `RoundResult.kind`. Normally reached for the five "shared-verdict" modes
 * (claim, turn_based_cut, voting, shared_grid, relay), since `guess_who`'s
 * `finished` phase routes to `IdentityRevealScreen` — but only when its
 * `endgame` is populated, so a reconnect into a finished room before
 * `identity.revealed` lands here too and `reveal` needs an arm. This is
 * the shareable summary — wiring an actual share is a later task, so no
 * backend call is made here.
 */
export function RoomResults({
  state,
  currentUserId,
  packFormat = "sacrifice_one",
}: {
  state: RoomState;
  /** Marks the viewer's own picks on the aside's board. */
  currentUserId?: string | null;
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair.
   * Defaults to sacrifice_one, this board's original (and only) framing. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}) {
  const t = useTranslations("room");
  const byId = new Map(state.players.map((p) => [p.userId, p]));
  // Every round a two-option vote — a 1v1 (or a two-pool nxn) Voting game.
  // Null the moment anything else is in the list, so a mixed game never gets
  // half a recap in one shape and half in another.
  const votes = state.results.filter(
    (result): result is VoteRoundResult => result.kind === "vote",
  );
  const versusRecap =
    votes.length > 0 &&
    votes.length === state.results.length &&
    votes.every((round) => round.optionIds.length === 2)
      ? votes
      : null;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* The page's own h1 lives in here. The eyebrow-and-title header this
          replaced said "RESULTS" over the pack name and nothing else — it
          never said the game was OVER, or how big it was.

          There is no standalone back link above it any more either: the aside
          carries "Back to pack" as a deliberate next step, and a second copy
          floating over the stats was the same destination twice. */}
      <RoomResultHero state={state} />

      {/* The same shape solo play's result screen uses: the recap in the main
          column, an aside carrying what-to-do-next over a board about the whole
          game. Below the breakpoint the aside becomes `display: contents` and
          the panel jumps to the front, so the reading order is next-step →
          recap → board rather than a CTA stranded under five round cards. */}
      <div className="grid grid-cols-1 items-start gap-[18px] min-[1040px]:grid-cols-[minmax(0,1fr)_minmax(0,330px)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          {/* A game of two-option votes IS solo play's 1v1 recap with more
              people in it, so it gets that exact shape — one caps heading, then
              hairline-separated matchup rows — rather than a stack of bordered
              cards that says the same thing in a different visual language.
              Anything else (a mixed game, 3+ options, another mode) keeps the
              per-round sections, which is what a non-matchup round needs. */}
          {versusRecap ? (
            <VoteRoundByRound rounds={versusRecap} byId={byId} />
          ) : (
            state.results.map((result) => (
              <section
                key={result.index}
                aria-label={t("results.roundLabel", {
                  index: result.index + 1,
                })}
                className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface-card p-5"
              >
                {/* A numbered chip and the round's own name, on one baseline
                    with a rule under them — the card used to open with a small
                    bold line that read as body text, so five stacked rounds ran
                    together with nothing marking where each began.

                    The name when the author gave one: this screen is where a
                    player reviews the whole game, so numbering every block
                    defeats the point of naming them. The section's accessible
                    name stays the stable "Round N", which is what makes the
                    landmark list read as an ordered game. */}
                <div className="flex items-center gap-2.5 border-b border-border pb-2.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 flex-none place-items-center rounded-chip bg-white/[0.06] font-mono text-[12px] font-bold text-foreground-secondary tabular-nums"
                  >
                    {result.index + 1}
                  </span>
                  <Text className="min-w-0 truncate text-[14px] font-bold tracking-[-0.01em]">
                    {result.name ||
                      t("results.roundLabel", { index: result.index + 1 })}
                  </Text>
                </div>
                {result.kind === "survivor" && (
                  <SurvivorResultBlock
                    result={result}
                    byId={byId}
                    packFormat={packFormat}
                  />
                )}
                {result.kind === "vote" && (
                  <VoteResultBlock result={result} byId={byId} />
                )}
                {result.kind === "borda" && (
                  <BordaResultBlock result={result} />
                )}
                {result.kind === "relay" && (
                  <RelayResultBlock result={result} byId={byId} />
                )}
                {/* Guess-who normally routes its finished phase to
              IdentityRevealScreen, but only when `endgame` is populated —
              reconnecting into a finished room before `identity.revealed`, or
              a guessing phase that closed without one, falls through to here.
              Without an arm those rounds rendered as a bordered box holding
              nothing but the round name. */}
                {result.kind === "reveal" && (
                  <RevealResultBlock result={result} />
                )}
              </section>
            ))
          )}
        </div>

        <aside className="flex flex-col gap-[14px] max-[1039px]:contents">
          <RoomResultAgainPanel
            packId={state.packId}
            className="max-[1039px]:order-first"
          />
          <RoomTopPickedBoard state={state} currentUserId={currentUserId} />
        </aside>
      </div>
    </div>
  );
}

function SurvivorResultBlock({
  result,
  byId,
  packFormat,
}: {
  result: SurvivorRoundResult;
  byId: Map<string, RoomPlayerState>;
  packFormat: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}) {
  const t = useTranslations("room");
  const claimantFor = (itemId: string): RoomPlayerState | null => {
    for (const [userId, claimed] of Object.entries(result.claims)) {
      if (claimed === itemId) return byId.get(userId) ?? null;
    }
    return null;
  };
  // Whether the item nobody claimed is the good outcome. On sacrifice_one it
  // is not: the odd one out is the item that got sacrificed.
  const oddOneOutIsGood = packFormat === "save_one";

  return (
    <div className="flex flex-col gap-3">
      {/* Titles, not media. A results screen carries every round at once, so an
          elimination game put forty videos on one page — the recap is for
          reading what happened, and the round screens are where the clips were
          watched. The colour still says which way each item went. */}
      <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {result.items.map((item) => {
          const isSurvivor = item.id === result.survivorItemId;
          const claimant = isSurvivor ? null : claimantFor(item.id);
          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-col gap-1.5 rounded-tile border p-[9px_11px]",
                isSurvivor === oddOneOutIsGood
                  ? "border-success/60 bg-success/[0.07]"
                  : "border-danger/50 bg-danger/[0.05]",
              )}
            >
              <Text className="min-w-0 truncate text-[13px] font-semibold">
                {item.title}
              </Text>
              {claimant ? (
                <span className="flex items-center gap-1.5">
                  <UserAvatar
                    username={claimant.username}
                    avatarKey={claimant.avatarKey}
                    tone
                    className="h-[18px] w-[18px] flex-none rounded-full text-[8px]"
                  />
                  <Text
                    variant="tertiary"
                    className="min-w-0 truncate text-[11.5px] font-medium"
                  >
                    {claimant.username}
                  </Text>
                </span>
              ) : (
                <Text
                  variant="tertiary"
                  className="text-[11.5px] font-semibold"
                >
                  {t(
                    `round.survivor${packFormat === "save_one" ? "Save" : "Sacrifice"}`,
                  )}
                </Text>
              )}
            </li>
          );
        })}
      </ul>

      {/* Turn-based cut's ordered cut history — a single player may cut more
          than once, which the per-item claimant list above cannot convey.
          Claim's own rounds never populate `cuts`. */}
      {result.cuts && result.cuts.length > 0 && (
        <ol
          aria-label={t("turnBasedCut.cutOrderHeading")}
          className="flex flex-wrap items-center gap-2"
        >
          {result.cuts.map((cut, index) => {
            const cutter = byId.get(cut.userId);
            const item = result.items.find((i) => i.id === cut.itemId);
            return (
              <li
                key={`${cut.userId}-${cut.itemId}-${index}`}
                className="flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs"
              >
                <span className="font-semibold">
                  {cutter?.username ?? cut.userId}
                </span>
                <span className="text-foreground-tertiary">
                  {t("turnBasedCut.cutVerb")}
                </span>
                <span>{item?.title ?? cut.itemId}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function VoteRoundByRound({
  rounds,
  byId,
}: {
  rounds: VoteRoundResult[];
  byId: Map<string, RoomPlayerState>;
}) {
  const t = useTranslations("room");
  return (
    <section className="flex min-w-0 flex-col gap-[13px]">
      {/* A plain h2, not `<Text as="h2">`: every Text variant sets a colour and
          cn() is a plain join, so a `text-acc` handed in from outside loses to
          the variant's own `text-foreground` and the heading renders white. */}
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <h2 className="text-[12px] font-bold tracking-[0.14em] text-acc uppercase">
          {t("results.roundByRoundHeading")}
        </h2>
        <Text variant="tertiary" className="text-[12.5px]">
          {t("results.roundByRoundNote")}
        </Text>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {rounds.map((round) => (
          <div key={round.index} className="py-4 first:pt-0 last:pb-0">
            <VoteMatchupRow round={round} byId={byId} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * One round: the two contenders either side of a centre column. Below `sm` the
 * three stack — two cards plus a divider side by side leaves nothing readable
 * on a phone.
 */
function VoteMatchupRow({
  round,
  byId,
}: {
  round: VoteRoundResult;
  byId: Map<string, RoomPlayerState>;
}) {
  const t = useTranslations("room");
  // `sides` first: an nxn option is a POOL, so its name is the choice and the
  // items it drew are only context. Falling through to the id is the last
  // resort for a result the backend sent without `sides` — a poor label, but
  // better than dropping the side and under-reporting the round.
  const titleFor = (optionId: string) =>
    round.sides?.find((side) => side.id === optionId)?.name ??
    round.items.find((item) => item.id === optionId)?.title ??
    optionId;
  // nxn only: a pool name is the CHOICE, but on its own it says nothing about
  // what was on the board — "Sci-fi beat Thriller" is not a result anyone can
  // picture. The items it drew are.
  const drawnFor = (optionId: string): string[] =>
    (round.sides?.find((side) => side.id === optionId)?.itemIds ?? [])
      .map((id) => round.items.find((item) => item.id === id)?.title)
      .filter((title): title is string => Boolean(title));
  const votersFor = (optionId: string): RoomPlayerState[] =>
    Object.entries(round.votes)
      .filter(([, voted]) => voted === optionId)
      .map(([userId]) => byId.get(userId))
      .filter((p): p is RoomPlayerState => p !== undefined);

  const [left, right] = round.optionIds;
  const winner = titleFor(round.winnerOptionId);
  const loser = titleFor(round.winnerOptionId === left ? right : left);

  return (
    <div
      role="group"
      aria-label={`${round.name} — ${winner} / ${loser}`}
      // `items-stretch`, so both cards take the centre column's full height
      // rather than floating as two thin bars beside a three-line stack. The
      // centre column is a FIXED width, not `auto`: sized to its content it
      // grows with the round's name, so a long name would shrink both cards
      // and every row would end up a different width.
      className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"
    >
      <VoteContenderCard
        title={titleFor(left)}
        drawn={drawnFor(left)}
        won={left === round.winnerOptionId}
        voters={votersFor(left)}
        side="left"
      />
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <Text variant="tertiary" className="text-xs tracking-wide uppercase">
          {round.name || t("results.roundLabel", { index: round.index + 1 })}
        </Text>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground-secondary">
          VS
        </span>
        <Text variant="tertiary" className="text-xs">
          {t("results.roundVoted", {
            count: Object.keys(round.votes).length,
          })}
        </Text>
      </div>
      <VoteContenderCard
        title={titleFor(right)}
        drawn={drawnFor(right)}
        won={right === round.winnerOptionId}
        voters={votersFor(right)}
        side="right"
      />
    </div>
  );
}

/**
 * One side of a round, on the side it was drawn on — green where the room went,
 * red where it didn't.
 *
 * The right card's contents are reversed so both counts land on the inner edge,
 * either side of the VS, and read as one split rather than two unrelated stats.
 * Where solo puts a percentage this puts the people: there are four known
 * players here, and "Alice, Bogdan and Devrim" is a fact about the evening that
 * "75%" is the same fact with the names filed off.
 */
function VoteContenderCard({
  title,
  drawn,
  won,
  voters,
  side,
}: {
  title: string;
  /** nxn: the items the pool drew this round. Empty for every other format,
   * where the title IS the item. */
  drawn: string[];
  won: boolean;
  voters: RoomPlayerState[];
  side: "left" | "right";
}) {
  const t = useTranslations("room");
  return (
    <div
      data-testid={won ? "winner" : "loser"}
      data-side={side}
      className={cn(
        "flex min-w-0 items-center gap-4 rounded-tile border p-[13px_16px]",
        side === "left" ? "flex-row" : "flex-row-reverse",
        won ? "border-success/60 bg-success/5" : "border-danger/60 bg-danger/5",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1.5",
          side === "left" ? "items-start text-start" : "items-end text-end",
        )}
      >
        {/* Always rendered, hidden on the loser rather than omitted: the label
            is a whole line of height, so dropping it pushed that card's title
            and voter chips up and nothing lined up across the VS. `invisible`
            keeps the box; `aria-hidden` keeps "WINNER" from being read out on
            the side that lost. */}
        <Text
          aria-hidden={!won}
          className={cn(
            "text-[11px] font-semibold tracking-wide uppercase",
            won ? "text-success" : "invisible",
          )}
        >
          {t("voting.winnerHeading")}
        </Text>
        <Text className="w-full min-w-0 truncate text-sm font-semibold">
          {title}
        </Text>
        {/* The pool's items, bulleted and behind a hairline — the same
            treatment the history tables give them, so the pool name still
            reads as the choice and these as what it contained.

            `w-full`, not the column's `items-start`/`items-end` alignment: an
            aligned child is sized to its CONTENT, so a long item title grew
            this span past the card and took the hairline out with it — the
            divider ran off the edge and the `truncate` below never had a width
            to truncate against. Bounded here, the rows ellipsise instead, and
            `justify-*` does the edge-alignment that `items-*` used to. */}
        {drawn.length > 0 && (
          <span
            className={cn(
              "flex w-full min-w-0 flex-col gap-0.5 border-t border-current/15 pt-1.5 text-[11.5px] font-medium text-foreground-tertiary",
              side === "left" ? "items-start" : "items-end",
            )}
          >
            {drawn.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className={cn(
                  "flex w-full min-w-0 items-center gap-1.5",
                  side === "right" && "flex-row-reverse",
                )}
              >
                <span
                  aria-hidden
                  className="h-1 w-1 flex-none rounded-full bg-current opacity-60"
                />
                <span className="min-w-0 truncate">{item}</span>
              </span>
            ))}
          </span>
        )}
        {voters.length > 0 && (
          <span
            className={cn(
              "flex w-full min-w-0 flex-wrap gap-1.5",
              side === "right" && "justify-end",
            )}
          >
            {voters.map((voter) => (
              <span
                key={voter.userId}
                className="flex items-center gap-1.5 rounded-full border border-border bg-white/[0.04] py-0.5 pe-2 ps-0.5 text-[11.5px] font-semibold text-foreground-secondary"
              >
                <UserAvatar
                  username={voter.username}
                  avatarKey={voter.avatarKey}
                  tone
                  className="h-[18px] w-[18px] flex-none rounded-full text-[8px]"
                />
                {voter.username}
              </span>
            ))}
          </span>
        )}
      </div>
      <Text
        className={cn(
          "flex-none text-sm font-semibold tabular-nums",
          won ? "text-success" : "text-danger",
        )}
      >
        {voters.length}
      </Text>
    </div>
  );
}
function BordaResultBlock({ result }: { result: BordaRoundResult }) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  return (
    <ol className="flex flex-col gap-2">
      {result.order.map((tier, index) => (
        <li key={index} className="flex flex-wrap items-center gap-2.5">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-chip bg-white/[0.06] font-mono text-xs font-bold tabular-nums">
            {index + 1}
          </span>
          {/* A tier holds more than one id on a genuine tie, so each gets its
              own row rather than the titles being joined with a slash. */}
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            {tier.map((id) => (
              <RankedResultRow key={id} item={itemsById.get(id)} id={id} />
            ))}
          </span>
          {/* The Borda points. An ORDER on its own says which item came out
              ahead but not by how far — the difference between a tier that
              won by one point and one that ran away with it is the whole
              reason this mode aggregates ballots instead of counting votes.
              One figure per tier, because a tie is a tie precisely BECAUSE
              its members scored the same. */}
          <span className="flex-none font-mono text-[12.5px] font-bold text-foreground-secondary tabular-nums">
            {result.scores[tier[0]] ?? 0}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * One placed item on a results screen.
 *
 * Titles only. A ranked round is a LIST — the task is comparing rows against
 * each other — and a thumbnail per row turns a five-line comparison into a
 * page of scrolling. The clips belong on the round board, where they were
 * being judged.
 */
function RankedResultRow({ item, id }: { item?: Item; id: string }) {
  return (
    <Text className="min-w-0 text-sm font-semibold">{item?.title ?? id}</Text>
  );
}

/**
 * Guess-who's per-round reveal: which anonymous label picked what. The full
 * cross-round chronology lives in GuessWhoRevealBoard; here each round shows
 * only its own row, matching how every other kind renders one block per round.
 */
function RevealResultBlock({ result }: { result: RevealRoundResult }) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  return (
    <ul className="flex flex-col gap-1">
      {Object.entries(result.picks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, picks]) => (
          <li key={label} className="text-sm">
            <span className="font-mono font-bold">{label}</span>{" "}
            {picks.map((id) => itemsById.get(id)?.title ?? id).join(" › ")}
          </li>
        ))}
    </ul>
  );
}

function RelayResultBlock({
  result,
  byId,
}: {
  result: RelayRoundResult;
  byId: Map<string, RoomPlayerState>;
}) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  // itemId -> whoever placed it. A relay round places each item exactly once,
  // so there is no last-writer-wins to worry about.
  const placedByItem = new Map(
    result.placements.map((placement) => [placement.itemId, placement.userId]),
  );

  return (
    <ol className="flex flex-col gap-2">
      {result.order.map((id, index) => {
        const placedBy = byId.get(placedByItem.get(id) ?? "");
        return (
          <li key={id} className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-chip bg-white/[0.06] font-mono text-xs font-bold tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <RankedResultRow item={itemsById.get(id)} id={id} />
            </span>
            {/* Who put it there. A relay round is built one placement at a
                time and that is the ONLY per-player fact in it — a final order
                with no names attached is a list the room cannot argue about
                afterwards, which is most of the point of having played it. */}
            {placedBy && (
              <span className="flex flex-none items-center gap-1.5 rounded-full border border-border bg-white/[0.04] py-0.5 pe-2 ps-0.5 text-[11.5px] font-semibold text-foreground-secondary">
                <UserAvatar
                  username={placedBy.username}
                  avatarKey={placedBy.avatarKey}
                  tone
                  className="h-[18px] w-[18px] flex-none rounded-full text-[8px]"
                />
                {placedBy.username}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
function VoteResultBlock({
  result,
  byId,
}: {
  result: VoteRoundResult;
  byId: Map<string, RoomPlayerState>;
}) {
  const t = useTranslations("room");
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const priorityPlayer = byId.get(result.priorityUserId);
  return (
    <div className="flex flex-col gap-2">
      {/* EVERY option, not just the winner. Naming only what won never said
          what it beat — and on a 1v1 pack, whose entire round is one item
          against another, that is half the outcome missing. `optionIds` rather
          than `items`, because on an nxn round an option is a POOL and the
          items are only its context. */}
      <ul className="flex flex-col gap-1.5">
        {result.optionIds.map((optionId) => {
          const won = optionId === result.winnerOptionId;
          // An nxn option is a pool id that resolves to no item; the id is a
          // poor label but beats dropping the row and under-reporting the
          // round. (Carrying `sides` on a vote result the way a reveal now
          // does would name these properly — not done here.)
          const title = itemsById.get(optionId)?.title ?? optionId;
          const count = result.tally[optionId] ?? 0;
          return (
            <li
              key={optionId}
              aria-label={title}
              className={cn(
                "flex items-center gap-2.5 rounded-tile border p-[9px_11px]",
                won ? "border-live/40 bg-live/[0.08]" : "border-border",
              )}
            >
              <Text
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  won ? "font-semibold text-live" : "text-foreground-secondary",
                )}
              >
                {title}
              </Text>
              {won && (
                <span className="flex-none rounded-chip bg-live/[0.16] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-live uppercase">
                  {t("voting.winnerHeading")}
                </span>
              )}
              <span
                className={cn(
                  "min-w-4 flex-none text-end font-mono text-[12.5px] font-bold tabular-nums",
                  won ? "text-live" : "text-foreground-tertiary",
                )}
              >
                {count}
              </span>
            </li>
          );
        })}
      </ul>
      {result.tieBroken && priorityPlayer && (
        <Text variant="tertiary" className="text-xs">
          {t("voting.tieBrokenNote", { name: priorityPlayer.username })}
        </Text>
      )}
    </div>
  );
}
