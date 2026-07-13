"use client";

import { useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { SlotMode } from "@/src/shared/types/pack";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import { cn } from "@/src/shared/lib/cn";
import { newRound } from "@/src/features/create/create-pack.defaults";
import {
  type CreatePackValues,
  ELIMINATION_MIN_DRAW,
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
  const [bulkCount, setBulkCount] = useState("");

  const firstGroupId = groups[0]?.id ?? "";
  const resolved = resolveRoundDraws(groups, rounds);
  const roundsError = getFieldError(errors, "rounds");
  const groupById = new Map(groups.map((group) => [group.id, group]));

  function setSlot(
    roundIndex: number,
    patch: {
      groupId?: string;
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
    if (mode === "manual") {
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

  function changeGroup(roundIndex: number, groupId: string) {
    const slot = rounds[roundIndex].slots[0];
    if (slot.mode === "manual") {
      // The old pins belong to the old group — reseed from the new one.
      const seeded = availableItemIds(
        groupId,
        roundIndex,
        ELIMINATION_MIN_DRAW,
      );
      setSlot(roundIndex, { groupId, itemIds: seeded });
    } else {
      setSlot(roundIndex, { groupId });
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
      slot.groupId,
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

  function applyBulkCount() {
    const value = Number(bulkCount);
    if (bulkCount === "" || Number.isNaN(value)) return;
    rounds.forEach((round, index) => {
      if (round.slots[0]?.mode === "random") {
        setSlot(index, { count: value });
      }
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("roundsHeading")}
      </Text>

      {rounds.map((round, index) => {
        const slot = round.slots[0];
        const group = groupById.get(slot.groupId);
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
        const reserved = pinnedElsewhere(slot.groupId, index);
        const maxPlaces = groupItems.length - reserved.size;

        return (
          <Card
            key={round.id}
            className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none"
          >
            {/* Group leads — every place draws from it. */}
            <div className="flex flex-col gap-1">
              <Text variant="tertiary" className="text-xs">
                {t("roundGroup")}
              </Text>
              <Select
                value={slot.groupId}
                onChange={(e) => changeGroup(index, e.target.value)}
                aria-label={t("roundPool", { index: index + 1 })}
                className="font-medium"
                options={groups.map((g, gi) => ({
                  value: g.id,
                  label: g.name.trim() || t("groupName", { index: gi + 1 }),
                }))}
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
              <div className="flex rounded-[9px] border border-border bg-white/[0.03] p-0.5">
                <button
                  type="button"
                  onClick={() => switchMode(index, "random")}
                  aria-label={t("roundModeRandom", { index: index + 1 })}
                  aria-pressed={slot.mode === "random"}
                  className={cn(
                    "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
                    slot.mode === "random"
                      ? "bg-white/[0.12] text-foreground"
                      : "text-foreground-secondary",
                  )}
                >
                  {t("random")}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode(index, "manual")}
                  aria-label={t("roundModeManual", { index: index + 1 })}
                  aria-pressed={slot.mode === "manual"}
                  className={cn(
                    "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
                    slot.mode === "manual"
                      ? "bg-white/[0.12] text-foreground"
                      : "text-foreground-secondary",
                  )}
                >
                  {t("manual")}
                </button>
              </div>
              {rounds.length > 1 && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => roundsArray.remove(index)}
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
                  className="w-16 text-center"
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
                      onClick={() => setPlaceCount(index, itemIds.length - 1)}
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
                      onClick={() => setPlaceCount(index, itemIds.length + 1)}
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
                    <div key={placeIndex} className="flex items-center gap-2.5">
                      <Text variant="tertiary" className="min-w-[58px] text-xs">
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
                role="status"
                className="text-xs text-foreground-secondary italic"
              >
                {t("roundUnderfill", { count: drawnCount })}
              </Text>
            )}
            {slotError && (
              <Text role="alert" className="text-sm text-danger">
                {slotError}
              </Text>
            )}
          </Card>
        );
      })}

      {roundsError && (
        <Text role="alert" className="text-sm text-danger">
          {roundsError}
        </Text>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => roundsArray.append(newRound(firstGroupId))}
        >
          {t("addRound")}
        </Button>
        <div className="flex items-center gap-2">
          <Text variant="secondary" className="text-sm">
            {t("setCountAllLabel")}
          </Text>
          <Input
            type="number"
            min={1}
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
            aria-label={t("setCountAll")}
            placeholder="4"
            className="w-16 text-center"
          />
          <Button type="button" variant="secondary" onClick={applyBulkCount}>
            {t("setCountAll")}
          </Button>
        </div>
      </div>
    </section>
  );
}
