"use client";

import { useTranslations } from "next-intl";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type {
  BordaRoundResult,
  RelayRoundResult,
  RevealRoundResult,
  RoomPlayerState,
  RoomState,
  SurvivorRoundResult,
  VoteRoundResult,
} from "./room-types";
import { RoomItemCard } from "./RoomItemCard";

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
  packFormat = "sacrifice_one",
}: {
  state: RoomState;
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair.
   * Defaults to sacrifice_one, this board's original (and only) framing. */
  packFormat?: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}) {
  const t = useTranslations("room");
  const byId = new Map(state.players.map((p) => [p.userId, p]));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("results.heading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {state.packTitle}
        </Text>
      </header>

      {/* The only terminal state that does NOT leave on its own — a player
          should get to read their own game summary at their own pace — so it
          needs an explicit way out. A real link, so middle-click and
          open-in-new-tab work. */}
      <BackButton
        href={`/packs/${state.packId}`}
        label={t("results.backToPack")}
      />

      {state.results.map((result) => (
        <section
          key={result.index}
          aria-label={t("results.roundLabel", { index: result.index + 1 })}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-5"
        >
          {/* The round's own name when it had one — this screen is where a
              player reviews the whole game, so numbering every block defeats
              the point of naming them. The section's accessible name stays the
              stable "Round N" so the landmark list reads as an ordered game. */}
          <Text variant="title" className="text-sm">
            {result.name ||
              t("results.roundLabel", { index: result.index + 1 })}
          </Text>
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
          {result.kind === "borda" && <BordaResultBlock result={result} />}
          {result.kind === "relay" && <RelayResultBlock result={result} />}
          {/* Guess-who normally routes its finished phase to
              IdentityRevealScreen, but only when `endgame` is populated —
              reconnecting into a finished room before `identity.revealed`, or
              a guessing phase that closed without one, falls through to here.
              Without an arm those rounds rendered as a bordered box holding
              nothing but the round name. */}
          {result.kind === "reveal" && <RevealResultBlock result={result} />}
        </section>
      ))}
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
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item, index) => {
          const isSurvivor = item.id === result.survivorItemId;
          return (
            <RoomItemCard
              key={item.id}
              item={item}
              index={index}
              format={packFormat}
              status={isSurvivor ? "survivor" : "sacrificed"}
              claimant={isSurvivor ? null : claimantFor(item.id)}
            />
          );
        })}
      </div>

      {/* Turn-based cut's ordered cut history — see RoomBetween's identical
          block. Claim's own rounds never populate `cuts`. */}
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
    </>
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
  const winner = result.items.find((item) => item.id === result.winnerOptionId);
  const priorityPlayer = byId.get(result.priorityUserId);
  return (
    <div className="flex flex-col gap-2">
      <Text className="text-lg font-semibold text-live">{winner?.title}</Text>
      {result.tieBroken && priorityPlayer && (
        <Text variant="tertiary" className="text-xs">
          {t("voting.tieBrokenNote", { name: priorityPlayer.username })}
        </Text>
      )}
    </div>
  );
}

function BordaResultBlock({ result }: { result: BordaRoundResult }) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  return (
    <ol className="flex flex-col gap-1">
      {result.order.map((tier, index) => (
        <li
          key={index}
          className={cn("text-sm", tier.length > 1 && "font-medium")}
        >
          <span className="font-semibold">{index + 1}.</span>{" "}
          {tier.map((id) => itemsById.get(id)?.title ?? id).join(" / ")}
        </li>
      ))}
    </ol>
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

function RelayResultBlock({ result }: { result: RelayRoundResult }) {
  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  return (
    <ol className="flex flex-col gap-1">
      {result.order.map((id, index) => (
        <li key={id} className="text-sm">
          <span className="font-semibold">{index + 1}.</span>{" "}
          {itemsById.get(id)?.title ?? id}
        </li>
      ))}
    </ol>
  );
}
