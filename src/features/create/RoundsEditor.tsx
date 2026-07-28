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
import { RoundsToolbar } from "@/src/features/create/RoundsToolbar";
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
  // Feeds RoundsToolbar's live stepper + "drifted" amber flag below — see the
  // bulk.current/allMatch comment there.
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
      <StepHeader step={4} title={t("roundsHeading")} hint={t("roundsHint")} />

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
            {/* Collapsed by default (T6) — number + name + a one-line pool
                summary + a chevron, expanding to the full editor below on
                click. Toggling is a plain button (not the round's own name
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
              className="flex w-full items-center gap-2.5 text-start"
            >
              <ChevronDown
                aria-hidden
                className={cn(
                  "h-4 w-4 shrink-0 text-foreground-tertiary transition-transform",
                  expanded && "rotate-180",
                )}
                strokeWidth={1.8}
              />
              <Text className="text-[14px] font-semibold">
                {round.name?.trim() || t("roundLabel", { index: index + 1 })}
              </Text>
              <Text
                variant="tertiary"
                className="ms-auto truncate text-[12.5px]"
              >
                {poolLabel} · {t("roundDraws", { count: drawnCount })}
              </Text>
            </button>

            {!expanded && underfilled && (
              <Text
                variant="tertiary"
                role="status"
                className="ms-[26px] text-xs italic"
              >
                {t("roundUnderfill", { count: drawnCount })}
              </Text>
            )}
            {!expanded && slotError && (
              <Text variant="danger" role="alert" className="ms-[26px] text-sm">
                {slotError}
              </Text>
            )}

            {expanded && (
              <>
                {/* Group leads — every place draws from it. */}
                <div className="flex flex-col gap-1">
                  <Text variant="tertiary" className="text-xs">
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

                <div className="flex flex-wrap items-center gap-2.5 border-b border-border pb-3">
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
                    className="min-w-[130px] flex-1"
                  />
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
                  {rounds.length > 1 && (
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        roundsArray.remove(index);
                        // The Remove control only renders on the expanded
                        // round, so this always removes whichever round was
                        // open — expand whichever survivor now sits in its
                        // place (the next round, or the previous one if it
                        // was last) rather than leaving everything collapsed.
                        const remaining = rounds.filter((_, i) => i !== index);
                        setExpandedRoundId(
                          remaining[Math.min(index, remaining.length - 1)]
                            ?.id ?? null,
                        );
                      }}
                      aria-label={t("removeRound", { index: index + 1 })}
                    >
                      {t("remove")}
                    </Button>
                  )}
                </div>

                {slot.mode === "random" ? (
                  <div className="flex items-center gap-2.5">
                    <Text variant="secondary" className="text-sm">
                      {t("roundCountLabel", { index: index + 1 })}
                    </Text>
                    <Input
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
                      className="h-[46px] w-[54px] text-center font-semibold text-acc tabular-nums"
                    />
                  </div>
                ) : (
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
              </>
            )}
          </div>
        );
      })}

      {roundsError && (
        <Text variant="danger" role="alert" className="text-sm">
          {roundsError}
        </Text>
      )}

      <RoundsToolbar
        addLabel={t("addRound")}
        onAddRound={() => {
          // Auto-expand the new round — the author almost always wants to
          // set its pool right away, and it's the only round guaranteed to
          // start with nothing configured.
          const round = newRound(firstGroupId);
          roundsArray.append(round);
          setExpandedRoundId(round.id);
        }}
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
          allMatch: randomRoundCounts.every((c) => c === randomRoundCounts[0]),
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
    </section>
  );
}
