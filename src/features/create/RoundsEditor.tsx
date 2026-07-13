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
 * ordered list of single-slot rounds, each drawing from one pool. A live
 * feasibility hint (via {@link resolveRoundDraws}) shows how many items each
 * round actually draws given the per-pool no-repeat dedup, warning softly when a
 * random round can't fill its configured count.
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

  function setSlot(
    roundIndex: number,
    patch: { groupId?: string; mode?: SlotMode; count?: number | undefined },
  ) {
    const current = rounds[roundIndex].slots[0];
    const next = { ...current, ...patch };
    setValue(`rounds.${roundIndex}.slots.0`, next, {
      shouldValidate: false,
      shouldDirty: true,
    });
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
        const drawnCount = resolved[index]?.slots[0]?.drawnCount ?? 0;
        const underfilled =
          slot.mode === "random" &&
          slot.count !== undefined &&
          drawnCount < slot.count;
        const slotError =
          getFieldError(errors, `rounds.${index}.slots.0`) ??
          getFieldError(errors, `rounds.${index}.slots.0.groupId`) ??
          getFieldError(errors, `rounds.${index}.slots.0.count`);

        return (
          <Card
            key={round.id}
            className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none"
          >
            <div className="flex flex-wrap items-center gap-2.5">
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
              <Select
                value={slot.groupId}
                onChange={(e) => setSlot(index, { groupId: e.target.value })}
                aria-label={t("roundPool", { index: index + 1 })}
                className="flex-1 min-w-[140px]"
                options={groups.map((group, gi) => ({
                  value: group.id,
                  label: group.name.trim() || t("groupName", { index: gi + 1 }),
                }))}
              />
              <div className="flex rounded-[9px] border border-border bg-white/[0.03] p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setSlot(index, {
                      mode: "random",
                      count: slot.count ?? ELIMINATION_MIN_DRAW,
                    })
                  }
                  aria-label={t("roundModeRandom", { index: index + 1 })}
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
                  onClick={() => setSlot(index, { mode: "manual" })}
                  aria-label={t("roundModeManual", { index: index + 1 })}
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
              {slot.mode === "random" && (
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
              )}
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

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="secondary"
          onClick={() => roundsArray.append(newRound(firstGroupId))}
        >
          {t("addRound")}
        </Button>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={bulkCount}
            onChange={(e) => setBulkCount(e.target.value)}
            aria-label={t("setCountAll")}
            placeholder={t("setCountAll")}
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
