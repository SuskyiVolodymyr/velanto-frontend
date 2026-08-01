"use client";

import { useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { GroupMode, SlotMode } from "@/src/shared/types/pack";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import {
  RoundsBulkBar,
  RoundsAddButton,
} from "@/src/features/create/RoundsToolbar";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { StepHeader } from "@/src/features/create/StepHeader";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import {
  newRound,
  randomSlot,
} from "@/src/features/create/create-pack.defaults";
import {
  RANDOM_POOL_VALUE,
  availablePoolCount,
} from "@/src/features/create/random-pool-option";
import {
  type CreatePackValues,
  ELIMINATION_MIN_DRAW,
  ELIMINATION_MAX_DRAW,
} from "@/src/features/create/create-pack.schema";

/**
 * The elimination-format body (save_one / sacrifice_one / rank_blind): an
 * ordered list of single-slot rounds, each drawing from one pool. A round is
 * either `random` (draw N at random) or `manual` (the author pins a specific
 * item to each place). Manual pins are reserved from the pool, so an item can be
 * placed only once across the pack. A live feasibility hint (via
 * {@link resolveRoundDraws}) shows how many items each round actually draws.
 */
export function RoundsEditor() {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { errors } = formState;
  const roundsArray = useFieldArray({
    control,
    name: "rounds",
    keyName: "fieldId",
  });
  const groups = useWatch({ control, name: "groups" });
  const rounds = useWatch({ control, name: "rounds" });
  // T6: rounds render collapsed by default, one full editor open at a time.
  // The first round starts expanded — a freshly created pack has exactly one,
  // and opening it by default saves that first click for the common case
  // (chosen over "all collapsed", which would make a brand-new draft look
  // like it has nothing to edit).
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(
    () => rounds[0]?.id ?? null,
  );
  // `null` is a deliberate "everything collapsed" (the author clicked the
  // open round's own header again) and stays null. A non-null id that no
  // longer matches any round is different — a STALE reference, e.g.
  // CreatePackForm's format-family-switch effect replaces the whole `rounds`
  // array (with brand-new ids) the render AFTER this component mounts — and
  // falls back to the first round rather than leaving everything collapsed.
  const effectiveExpandedId =
    expandedRoundId === null ||
    rounds.some((round) => round.id === expandedRoundId)
      ? expandedRoundId
      : (rounds[0]?.id ?? null);

  const firstGroupId = groups[0]?.id ?? "";
  const resolved = resolveRoundDraws(groups, rounds);
  const roundsError = getFieldError(errors, "rounds");
  const groupById = new Map(groups.map((group) => [group.id, group]));
  // Feeds RoundsBulkBar's live stepper + "drifted" flag above — see its own
  // comment for how drift is judged.
  const randomRoundCounts = rounds
    .filter((round) => round.slots[0]?.mode === "random")
    .map((round) => round.slots[0]?.count ?? ELIMINATION_MIN_DRAW);

  function setSlot(
    roundIndex: number,
    patch: {
      groupId?: string;
      // Cleared when a round switches from a random pool back to a named one.
      groupMode?: GroupMode;
      mode?: SlotMode;
      count?: number | undefined;
      itemIds?: string[] | undefined;
    },
  ) {
    const current = rounds[roundIndex].slots[0];
    const next = { ...current, ...patch };
    setValue(`rounds.${roundIndex}.slots.0`, next, {
      shouldValidate: false,
      shouldDirty: true,
    });
  }

  // Item ids already pinned by a manual slot of the same group in OTHER rounds —
  // they're reserved, so this round can't place them too.
  function pinnedElsewhere(groupId: string, exceptRound: number): Set<string> {
    const set = new Set<string>();
    rounds.forEach((round, ri) => {
      if (ri === exceptRound) return;
      const slot = round.slots[0];
      if (slot?.mode === "manual" && slot.groupId === groupId) {
        (slot.itemIds ?? []).forEach((id) => set.add(id));
      }
    });
    return set;
  }

  // The first `n` group items not already reserved by another round — the seed
  // for a fresh manual slot and for newly added places.
  function availableItemIds(
    groupId: string,
    exceptRound: number,
    take: number,
    exclude: Set<string> = new Set(),
  ): string[] {
    const items = groupById.get(groupId)?.items ?? [];
    const taken = new Set([
      ...pinnedElsewhere(groupId, exceptRound),
      ...exclude,
    ]);
    const out: string[] = [];
    for (const item of items) {
      if (out.length >= take) break;
      if (!taken.has(item.id)) out.push(item.id);
    }
    return out;
  }

  function switchMode(roundIndex: number, mode: SlotMode) {
    const slot = rounds[roundIndex].slots[0];
    // The manual/random item toggle isn't rendered for a random pool — pinning
    // item ids needs a known pool — so there is always a group id here.
    if (mode === "manual" && slot.groupId) {
      const seeded = availableItemIds(
        slot.groupId,
        roundIndex,
        ELIMINATION_MIN_DRAW,
      );
      setSlot(roundIndex, { mode, itemIds: seeded, count: undefined });
    } else {
      setSlot(roundIndex, {
        mode,
        count: slot.count ?? ELIMINATION_MIN_DRAW,
        itemIds: undefined,
      });
    }
  }

  // A round either names a pool or asks for one at play time. Choosing "random"
  // replaces the whole slot: a stale groupId or pinned itemIds beside
  // groupMode: "random" would be a contradiction the API rejects.
  function changeGroup(roundIndex: number, groupId: string) {
    const slot = rounds[roundIndex].slots[0];
    if (groupId === RANDOM_POOL_VALUE) {
      setValue(
        `rounds.${roundIndex}.slots.0`,
        randomSlot(slot.count ?? ELIMINATION_MIN_DRAW),
        { shouldValidate: false, shouldDirty: true },
      );
      return;
    }
    if (slot.mode === "manual") {
      // The old pins belong to the old group — reseed from the new one.
      const seeded = availableItemIds(
        groupId,
        roundIndex,
        ELIMINATION_MIN_DRAW,
      );
      setSlot(roundIndex, { groupId, groupMode: undefined, itemIds: seeded });
    } else {
      setSlot(roundIndex, { groupId, groupMode: undefined });
    }
  }

  function setPlaceCount(roundIndex: number, n: number) {
    const slot = rounds[roundIndex].slots[0];
    const current = slot.itemIds ?? [];
    if (n <= current.length) {
      setSlot(roundIndex, { itemIds: current.slice(0, Math.max(0, n)) });
      return;
    }
    const extra = availableItemIds(
      slot.groupId ?? "",
      roundIndex,
      n - current.length,
      new Set(current),
    );
    setSlot(roundIndex, { itemIds: [...current, ...extra] });
  }

  function setPlaceItem(
    roundIndex: number,
    placeIndex: number,
    itemId: string,
  ) {
    const current = [...(rounds[roundIndex].slots[0].itemIds ?? [])];
    current[placeIndex] = itemId;
    setSlot(roundIndex, { itemIds: current });
  }

  return (
    <section className="flex flex-col gap-3">
      {/* Same heading + hint as VersusEditor now — both editors converged on
          one consistent "Rounds" label + "click a round to pick its pool"
          hint per the real mock, instead of each having its own copy. */}
      <StepHeader title={t("roundsHeading")} hint={t("roundsHint")} />

      {/* Mock: this bar sits right under the section header, before the
          round list — it used to be docked at the bottom beside "New
          round". */}
      <RoundsBulkBar
        bulk={{
          label: t("setCountAllLabel"),
          applyLabel: t("setCountAll"),
          min: 1,
          max: ELIMINATION_MAX_DRAW,
          placeholder: "4",
          // Represents only the random-mode rounds — a manual round has no
          // count of its own (it shows exactly its pinned items), so it
          // can't drift from or agree with this number.
          current: randomRoundCounts[0] ?? ELIMINATION_MIN_DRAW,
          counts: randomRoundCounts,
          onApply: (value) =>
            rounds.forEach((round, index) => {
              // Only a random draw has a count to set; a manual round shows
              // exactly the items its author pinned.
              if (round.slots[0]?.mode === "random") {
                setSlot(index, { count: value });
              }
            }),
        }}
      />

      {rounds.map((round, index) => {
        const slot = round.slots[0];
        const randomPool = slot.groupMode === "random";
        const group = randomPool
          ? undefined
          : groupById.get(slot.groupId ?? "");
        const groupItems = group?.items ?? [];
        const drawnCount = resolved[index]?.slots[0]?.drawnCount ?? 0;
        const underfilled =
          slot.mode === "random" &&
          slot.count !== undefined &&
          drawnCount < slot.count;
        const slotError =
          getFieldError(errors, `rounds.${index}.slots.0`) ??
          getFieldError(errors, `rounds.${index}.slots.0.groupId`) ??
          getFieldError(errors, `rounds.${index}.slots.0.count`) ??
          getFieldError(errors, `rounds.${index}.slots.0.itemIds`);

        const itemIds = slot.itemIds ?? [];
        const reserved = pinnedElsewhere(slot.groupId ?? "", index);
        // Cap places at the pool's unreserved items AND the elimination max.
        const maxPlaces = Math.min(
          groupItems.length - reserved.size,
          ELIMINATION_MAX_DRAW,
        );
        const expanded = round.id === effectiveExpandedId;
        // `index` here is the ROUND's position in `rounds` — an unnamed
        // pool's fallback label needs the POOL's own position in `groups`
        // instead (a round 3 drawing from unnamed pool 1 must still say
        // "Pool 1 name", not "Pool 3 name"). Mirrors VersusEditor's
        // poolLabelFor.
        const poolIndex = groups.findIndex((g) => g.id === slot.groupId);
        const poolLabel = randomPool
          ? t("randomPoolOption", {
              count: Math.max(
                0,
                availablePoolCount(groups, rounds, {
                  roundIndex: index,
                  slotIndex: 0,
                }),
              ),
            })
          : group?.name.trim() ||
            t("groupName", { index: Math.max(0, poolIndex) + 1 });

        return (
          <div
            key={round.id}
            className="flex flex-col gap-[13px] rounded-tile border border-border bg-surface-card p-[15px]"
          >
            {/* Collapsed by default (T6) — number badge + name + a one-line
                pool summary + a chevron, expanding to the full editor below
                on click. Toggling is a plain button (not the round's own name
                Input) so a click never fights text-field focus. */}
            <button
              type="button"
              // Compares against `expanded` (which already resolved through
              // `effectiveExpandedId`), not the raw `expandedRoundId` state —
              // right after a format-family switch replaces `rounds` with
              // new ids, `expandedRoundId` still holds the STALE id while
              // round 1 is showing expanded via the fallback; comparing
              // against the raw state here would make the first click on
              // round 1's own header a no-op (it'd re-pin the same round
              // instead of collapsing it).
              onClick={() => setExpandedRoundId(expanded ? null : round.id)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-[11px] text-start"
            >
              <span
                aria-hidden
                className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] border border-border bg-white/[0.06] text-[11.5px] font-bold text-foreground-secondary"
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-[2px]">
                <Text className="truncate text-[13.5px] font-semibold">
                  {round.name?.trim() || t("roundLabel", { index: index + 1 })}
                </Text>
                <Text variant="tertiary" className="truncate text-[11.5px]">
                  {poolLabel} · {t("roundDraws", { count: drawnCount })}
                </Text>
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "ms-auto h-[14px] w-[14px] flex-none text-foreground-tertiary transition-transform",
                  expanded && "rotate-180",
                )}
                strokeWidth={2.2}
              />
            </button>

            {!expanded && underfilled && (
              <Text
                variant="tertiary"
                role="status"
                className="ms-[37px] text-xs italic"
              >
                {t("roundUnderfill", { count: drawnCount })}
              </Text>
            )}
            {!expanded && slotError && (
              <Text variant="danger" role="alert" className="ms-[37px] text-sm">
                {slotError}
              </Text>
            )}

            {expanded && (
              // Mock: the expanded editor sits in its own cyan-bordered
              // #0F1116 sub-panel nested inside the round's own #171A22
              // card — this used to render as bare fields directly in the
              // round card with just a divider line.
              <div className="flex flex-col gap-[13px] rounded-[13px] border border-acc/35 bg-[#0F1116] p-[14px]">
                {/* Round name + count sit side by side (mock), not stacked —
                    and the count is a real −/value/+ stepper, not a bare
                    number input that (via the shared Input's own `w-full`
                    losing a cascade fight to this className — the same
                    `cn()`-append gotcha hit twice already this session)
                    rendered as a huge full-width box instead of a compact
                    54px field. */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex min-w-[190px] flex-1 flex-col gap-[7px]">
                    <Text variant="tertiary" className="text-[11.5px] font-semibold">
                      {t("roundName", { index: index + 1 })}
                    </Text>
                    <Input
                      value={round.name ?? ""}
                      onChange={(e) =>
                        setValue(`rounds.${index}.name`, e.target.value, {
                          shouldValidate: false,
                          shouldDirty: true,
                        })
                      }
                      aria-label={t("roundName", { index: index + 1 })}
                      placeholder={t("roundLabel", { index: index + 1 })}
                    />
                  </div>
                  {slot.mode === "random" && (
                    <div className="flex w-[170px] flex-none flex-col gap-[7px]">
                      <Text variant="tertiary" className="text-[11.5px] font-semibold">
                        {t("roundCountLabel", { index: index + 1 })}
                      </Text>
                      <div className="flex h-10 items-center gap-[9px] rounded-control border border-white/10 bg-surface-card px-[6px]">
                        <button
                          type="button"
                          onClick={() =>
                            setSlot(index, {
                              count: Math.max(1, (slot.count ?? 1) - 1),
                            })
                          }
                          aria-label={t("decreaseCount")}
                          className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-foreground-secondary transition-colors hover:bg-white/[0.08] hover:text-foreground"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={ELIMINATION_MAX_DRAW}
                          value={slot.count ?? ""}
                          onChange={(e) =>
                            setSlot(index, {
                              count:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                          aria-label={t("roundCountLabel", { index: index + 1 })}
                          className="min-w-0 flex-1 border-0 bg-transparent text-center text-[15px] font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSlot(index, {
                              count: Math.min(
                                ELIMINATION_MAX_DRAW,
                                (slot.count ?? 1) + 1,
                              ),
                            })
                          }
                          aria-label={t("increaseCount")}
                          className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-foreground-secondary transition-colors hover:bg-white/[0.08] hover:text-foreground"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Group leads — every place draws from it. */}
                <div className="flex flex-col gap-1">
                  <Text variant="tertiary" className="text-[11.5px] font-semibold">
                    {t("roundGroup")}
                  </Text>
                  <Select
                    value={
                      randomPool ? RANDOM_POOL_VALUE : (slot.groupId ?? "")
                    }
                    onChange={(e) => changeGroup(index, e.target.value)}
                    aria-label={t("roundPool", { index: index + 1 })}
                    className="font-medium"
                    options={[
                      {
                        value: RANDOM_POOL_VALUE,
                        label: t("randomPoolOption", {
                          count: Math.max(
                            0,
                            availablePoolCount(groups, rounds, {
                              roundIndex: index,
                              slotIndex: 0,
                            }),
                          ),
                        }),
                      },
                      ...groups.map((g, gi) => ({
                        value: g.id,
                        label:
                          g.name.trim() || t("groupName", { index: gi + 1 }),
                      })),
                    ]}
                  />
                </div>

                {/* Pinning items needs a known pool, so a random-pool round has
                no manual option to offer — the toggle goes with it rather
                than sitting there disabled. */}
                {!randomPool && (
                  <SegmentedControl
                    value={slot.mode}
                    onChange={(mode) => switchMode(index, mode)}
                    options={[
                      {
                        value: "random",
                        label: t("random"),
                        ariaLabel: t("roundModeRandom", { index: index + 1 }),
                      },
                      {
                        value: "manual",
                        label: t("manual"),
                        ariaLabel: t("roundModeManual", { index: index + 1 }),
                      },
                    ]}
                  />
                )}

                {slot.mode === "manual" && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Text variant="secondary" className="text-sm">
                        {t("roundPlaces")}
                      </Text>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={itemIds.length <= 1}
                          onClick={() =>
                            setPlaceCount(index, itemIds.length - 1)
                          }
                          aria-label={t("removePlace")}
                          className="h-8 w-8 px-0"
                        >
                          −
                        </Button>
                        <Text className="min-w-[16px] text-center text-sm font-medium">
                          {itemIds.length}
                        </Text>
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={itemIds.length >= maxPlaces}
                          onClick={() =>
                            setPlaceCount(index, itemIds.length + 1)
                          }
                          aria-label={t("addPlace")}
                          className="h-8 w-8 px-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {itemIds.map((itemId, placeIndex) => {
                      // A place may pick any group item not pinned elsewhere and not
                      // used by another place in this round (its own value stays
                      // available so it renders selected).
                      const usedByOtherPlaces = new Set(
                        itemIds.filter((_, pi) => pi !== placeIndex),
                      );
                      return (
                        <div
                          key={placeIndex}
                          className="flex items-center gap-2.5"
                        >
                          <Text
                            variant="tertiary"
                            className="min-w-[58px] text-xs"
                          >
                            {t("placeLabel", { index: placeIndex + 1 })}
                          </Text>
                          <Select
                            value={itemId}
                            onChange={(e) =>
                              setPlaceItem(index, placeIndex, e.target.value)
                            }
                            aria-label={t("placeItemLabel", {
                              index: placeIndex + 1,
                            })}
                            className="flex-1"
                            options={groupItems.map((item, ii) => ({
                              value: item.id,
                              label: item.title.trim() || `#${ii + 1}`,
                              disabled:
                                item.id !== itemId &&
                                (reserved.has(item.id) ||
                                  usedByOtherPlaces.has(item.id)),
                            }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <div className="flex flex-col gap-1">
                    <Text variant="tertiary" className="text-xs">
                      {t("roundDraws", { count: drawnCount })}
                    </Text>
                    {underfilled && (
                      <Text
                        variant="tertiary"
                        role="status"
                        className="text-xs italic"
                      >
                        {t("roundUnderfill", { count: drawnCount })}
                      </Text>
                    )}
                    {slotError && (
                      <Text variant="danger" role="alert" className="text-sm">
                        {slotError}
                      </Text>
                    )}
                  </div>
                  <div className="ms-auto flex items-center gap-2">
                    {rounds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          roundsArray.remove(index);
                          // The Remove control only renders on the expanded
                          // round, so this always removes whichever round
                          // was open — expand whichever survivor now sits in
                          // its place (the next round, or the previous one
                          // if it was last) rather than leaving everything
                          // collapsed.
                          const remaining = rounds.filter(
                            (_, i) => i !== index,
                          );
                          setExpandedRoundId(
                            remaining[Math.min(index, remaining.length - 1)]
                              ?.id ?? null,
                          );
                        }}
                        aria-label={t("removeRound", { index: index + 1 })}
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-danger/30 bg-danger/10 text-[#ff8c8c] transition-colors hover:bg-danger/[0.18]"
                      >
                        <svg
                          aria-hidden
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedRoundId(null)}
                      // A distinct accessible name from the visible "Done"
                      // label — otherwise this collides with the tag
                      // picker's own "Done" button (both real buttons named
                      // literally "Done" on the same page breaks
                      // `getByRole("button", { name: "Done" })` elsewhere).
                      aria-label={t("roundDoneAria", { index: index + 1 })}
                      className="h-10 rounded-[11px] bg-acc px-4 text-[13px] font-bold text-[#07131a] transition-colors hover:brightness-110"
                    >
                      {t("roundDone")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {roundsError && (
        <Text variant="danger" role="alert" className="text-sm">
          {roundsError}
        </Text>
      )}

      <RoundsAddButton
        addLabel={t("addRound")}
        onAddRound={() => {
          // Auto-expand the new round — the author almost always wants to
          // set its pool right away, and it's the only round guaranteed to
          // start with nothing configured.
          const round = newRound(firstGroupId);
          roundsArray.append(round);
          setExpandedRoundId(round.id);
        }}
      />
    </section>
  );
}
