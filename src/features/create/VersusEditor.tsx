"use client";

import { useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";
import { newVersusRound } from "@/src/features/create/create-pack.defaults";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import {
  type CreatePackValues,
  NXN_SIDE_COUNT_MIN,
  NXN_SIDE_COUNT_MAX,
} from "@/src/features/create/create-pack.schema";

/**
 * The versus-format body (nxn / 1v1). Each round is an INDEPENDENT 2-side
 * matchup: Side A draws from one pool, Side B from another — and the two MAY be
 * the same pool (a single-pool matchup, where the draw engine hands each side
 * disjoint items, so the pool size caps how many rounds it can feed). Rounds are
 * edited individually (add/remove, per-round pair + label + per-side count) with
 * a bulk "set for all" control, mirroring {@link RoundsEditor}. 1v1 pins the
 * per-side count to 1 (no input).
 */
export function VersusEditor() {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { errors } = formState;
  const roundsArray = useFieldArray({
    control,
    name: "rounds",
    keyName: "fieldId",
  });
  const format = useWatch({ control, name: "format" });
  const groups = useWatch({ control, name: "groups" });
  const rounds = useWatch({ control, name: "rounds" });
  const [bulkCount, setBulkCount] = useState("");

  const isHeadToHead = format === "1v1";
  const resolved = resolveRoundDraws(groups, rounds);
  const roundsError = getFieldError(errors, "rounds");

  const poolOptions = groups.map((group, index) => ({
    value: group.id,
    label: group.name.trim() || t("groupName", { index: index + 1 }),
  }));

  // The per-side count both sides of a round share (1v1 is always 1).
  const currentPerSide = isHeadToHead
    ? 1
    : (rounds[0]?.slots[0]?.count ?? NXN_SIDE_COUNT_MIN);

  function setSide(roundIndex: number, sideIndex: number, groupId: string) {
    setValue(`rounds.${roundIndex}.slots.${sideIndex}.groupId`, groupId, {
      shouldValidate: false,
      shouldDirty: true,
    });
  }

  // Both sides of a versus round share one per-side draw count.
  function setPerSide(roundIndex: number, count: number | undefined) {
    [0, 1].forEach((sideIndex) => {
      setValue(`rounds.${roundIndex}.slots.${sideIndex}.count`, count, {
        shouldValidate: false,
        shouldDirty: true,
      });
    });
  }

  function addRound() {
    const a = groups[0]?.id ?? "";
    const b = groups[1]?.id ?? groups[0]?.id ?? "";
    roundsArray.append(newVersusRound(a, b, isHeadToHead ? 1 : currentPerSide));
  }

  function applyBulkCount() {
    const value = Number(bulkCount);
    if (bulkCount === "" || Number.isNaN(value)) return;
    rounds.forEach((_, index) => setPerSide(index, value));
  }

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("matchupHeading")}
      </Text>

      {rounds.map((round, index) => {
        const slotA = round.slots[0];
        const slotB = round.slots[1];
        const singlePool = Boolean(
          slotA && slotB && slotA.groupId === slotB.groupId,
        );
        const drawA = resolved[index]?.slots[0]?.drawnCount ?? 0;
        const drawB = resolved[index]?.slots[1]?.drawnCount ?? 0;
        const slotError =
          getFieldError(errors, `rounds.${index}.slots`) ??
          getFieldError(errors, `rounds.${index}.slots.0`) ??
          getFieldError(errors, `rounds.${index}.slots.1`) ??
          getFieldError(errors, `rounds.${index}.slots.0.count`) ??
          getFieldError(errors, `rounds.${index}.slots.1.count`);

        return (
          <Card
            key={round.id}
            className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none"
          >
            <div className="flex items-center justify-between gap-2">
              <Text variant="tertiary" className="text-xs uppercase">
                {t("roundLabel", { index: index + 1 })}
              </Text>
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

            <Input
              value={round.name ?? ""}
              onChange={(e) =>
                setValue(`rounds.${index}.name`, e.target.value, {
                  shouldValidate: false,
                  shouldDirty: true,
                })
              }
              aria-label={t("roundName", { index: index + 1 })}
              placeholder={t("versusRoundNamePlaceholder")}
            />

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[130px] flex-1 flex-col gap-1">
                <Text variant="secondary" className="text-xs">
                  {t("versusSideA")}
                </Text>
                <Select
                  value={slotA?.groupId ?? ""}
                  onChange={(e) => setSide(index, 0, e.target.value)}
                  aria-label={t("versusSideARound", { index: index + 1 })}
                  options={poolOptions}
                />
              </div>
              <div className="flex min-w-[130px] flex-1 flex-col gap-1">
                <Text variant="secondary" className="text-xs">
                  {t("versusSideB")}
                </Text>
                <Select
                  value={slotB?.groupId ?? ""}
                  onChange={(e) => setSide(index, 1, e.target.value)}
                  aria-label={t("versusSideBRound", { index: index + 1 })}
                  options={poolOptions}
                />
              </div>
              {!isHeadToHead && (
                <div className="flex w-24 flex-col gap-1">
                  <Text variant="secondary" className="text-xs">
                    {t("versusPerSide")}
                  </Text>
                  <Input
                    type="number"
                    min={NXN_SIDE_COUNT_MIN}
                    max={NXN_SIDE_COUNT_MAX}
                    value={slotA?.count ?? ""}
                    onChange={(e) =>
                      setPerSide(
                        index,
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                    aria-label={t("versusPerSideRound", { index: index + 1 })}
                    className="text-center"
                  />
                </div>
              )}
            </div>

            <Text variant="tertiary" className="text-xs">
              {t("versusDrawHint", { a: drawA, b: drawB })}
            </Text>
            {singlePool && (
              <Text role="status" className="text-xs text-foreground-secondary">
                {t("versusSamePoolNote")}
              </Text>
            )}
            {slotError && (
              <Text variant="danger" role="alert" className="text-sm">
                {slotError}
              </Text>
            )}
          </Card>
        );
      })}

      {roundsError && (
        <Text variant="danger" role="alert" className="text-sm">
          {roundsError}
        </Text>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={addRound}>
          {t("addRound")}
        </Button>
        {isHeadToHead ? (
          <Text variant="secondary" className="text-sm">
            {t("versusPerSideFixed")}
          </Text>
        ) : (
          <div className="flex items-center gap-2">
            <Text variant="secondary" className="text-sm">
              {t("versusSetAllLabel")}
            </Text>
            <Input
              type="number"
              min={NXN_SIDE_COUNT_MIN}
              max={NXN_SIDE_COUNT_MAX}
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value)}
              aria-label={t("versusSetAllLabel")}
              placeholder="3"
              className="w-16 text-center"
            />
            <Button type="button" variant="secondary" onClick={applyBulkCount}>
              {t("versusSetAll")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
