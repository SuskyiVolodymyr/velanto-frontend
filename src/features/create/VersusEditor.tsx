"use client";

import { useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";
import {
  newVersusRound,
  randomSlot,
} from "@/src/features/create/create-pack.defaults";
import {
  RANDOM_POOL_VALUE,
  availablePoolCount,
} from "@/src/features/create/random-pool-option";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { RoundsToolbar } from "@/src/features/create/RoundsToolbar";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { StepHeader } from "@/src/features/create/StepHeader";
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
  // T6: same collapsed-by-default shape as RoundsEditor — see its comment for
  // why the first round starts open rather than everything collapsed.
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(
    () => rounds[0]?.id ?? null,
  );
  // `null` is deliberate ("everything collapsed"); a non-null STALE id (no
  // longer matching any round) falls back to the first round instead — see
  // RoundsEditor's identical comment (CreatePackForm's format-family-switch
  // effect replaces `rounds` with brand-new ids the render after this
  // component mounts).
  const effectiveExpandedId =
    expandedRoundId === null ||
    rounds.some((round) => round.id === expandedRoundId)
      ? expandedRoundId
      : (rounds[0]?.id ?? null);

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
  // Feeds RoundsToolbar's "drifted" amber flag — every round's own per-side
  // count (both its sides already share one, via setPerSide) compared
  // against currentPerSide.
  const perSideCounts = rounds.map(
    (round) => round.slots[0]?.count ?? NXN_SIDE_COUNT_MIN,
  );
  const perSideAllMatch = perSideCounts.every((c) => c === currentPerSide);

  // A side either names a pool or asks for one at play time — two different
  // slot shapes, so the whole slot is replaced rather than one field patched,
  // which would leave a stale groupId beside groupMode: "random".
  function setSide(roundIndex: number, sideIndex: number, value: string) {
    const path = `rounds.${roundIndex}.slots.${sideIndex}` as const;
    const count = rounds[roundIndex]?.slots[sideIndex]?.count ?? currentPerSide;
    setValue(
      path,
      value === RANDOM_POOL_VALUE
        ? randomSlot(count)
        : { groupId: value, mode: "random", count },
      { shouldValidate: false, shouldDirty: true },
    );
  }

  // Every pool, plus "draw me one" — its label carries how many are still free,
  // so the capacity rule reads as a countdown rather than an error at submit.
  function optionsForSide(roundIndex: number, slotIndex: number) {
    const available = Math.max(
      0,
      availablePoolCount(groups, rounds, { roundIndex, slotIndex }),
    );
    return [
      {
        value: RANDOM_POOL_VALUE,
        label: t("randomPoolOption", { count: available }),
      },
      ...poolOptions,
    ];
  }

  const sideValue = (
    slot: { groupId?: string; groupMode?: string } | undefined,
  ) =>
    slot?.groupMode === "random" ? RANDOM_POOL_VALUE : (slot?.groupId ?? "");

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
    const round = newVersusRound(a, b, isHeadToHead ? 1 : currentPerSide);
    roundsArray.append(round);
    // Auto-expand — same reasoning as RoundsEditor's addRound.
    setExpandedRoundId(round.id);
  }

  function poolLabelFor(
    roundIndex: number,
    slotIndex: number,
    slot: { groupId?: string; groupMode?: string } | undefined,
  ): string {
    if (slot?.groupMode === "random") {
      return t("randomPoolOption", {
        count: Math.max(
          0,
          availablePoolCount(groups, rounds, { roundIndex, slotIndex }),
        ),
      });
    }
    const poolIndex = groups.findIndex((g) => g.id === slot?.groupId);
    return (
      groups[poolIndex]?.name.trim() || t("groupName", { index: poolIndex + 1 })
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {/* Same heading + hint as RoundsEditor (both editors converged on one
          consistent "Rounds" label per the real mock) — VersusEditor used to
          say "Matchup" with no hint. */}
      <StepHeader step={4} title={t("roundsHeading")} hint={t("roundsHint")} />

      {rounds.map((round, index) => {
        const slotA = round.slots[0];
        const slotB = round.slots[1];
        // Two random sides consume different pools by construction, and a
        // random side never draws a pool this round pins — only two NAMED sides
        // can be the same pool.
        const singlePool = Boolean(
          slotA &&
          slotB &&
          slotA.groupMode !== "random" &&
          slotB.groupMode !== "random" &&
          slotA.groupId === slotB.groupId,
        );
        const drawA = resolved[index]?.slots[0]?.drawnCount ?? 0;
        const drawB = resolved[index]?.slots[1]?.drawnCount ?? 0;
        const slotError =
          getFieldError(errors, `rounds.${index}.slots`) ??
          getFieldError(errors, `rounds.${index}.slots.0`) ??
          getFieldError(errors, `rounds.${index}.slots.1`) ??
          getFieldError(errors, `rounds.${index}.slots.0.count`) ??
          getFieldError(errors, `rounds.${index}.slots.1.count`);
        const expanded = round.id === effectiveExpandedId;
        const matchupLabel = `${poolLabelFor(index, 0, slotA)} vs ${poolLabelFor(index, 1, slotB)}`;

        return (
          <div
            key={round.id}
            className="flex flex-col gap-[13px] rounded-tile border border-border bg-surface-card p-[15px]"
          >
            {/* Collapsed by default (T6), same shape as RoundsEditor. */}
            <button
              type="button"
              onClick={() =>
                setExpandedRoundId((current) =>
                  current === round.id ? null : round.id,
                )
              }
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
                {matchupLabel} · {t("versusDrawHint", { a: drawA, b: drawB })}
              </Text>
            </button>

            {!expanded && slotError && (
              <Text variant="danger" role="alert" className="ms-[26px] text-sm">
                {slotError}
              </Text>
            )}

            {expanded && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Text variant="tertiary" className="text-xs uppercase">
                    {t("roundLabel", { index: index + 1 })}
                  </Text>
                  {rounds.length > 1 && (
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        roundsArray.remove(index);
                        setExpandedRoundId((current) =>
                          current === round.id ? null : current,
                        );
                      }}
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
                      value={sideValue(slotA)}
                      onChange={(e) => setSide(index, 0, e.target.value)}
                      aria-label={t("versusSideARound", { index: index + 1 })}
                      options={optionsForSide(index, 0)}
                    />
                  </div>
                  <div className="flex min-w-[130px] flex-1 flex-col gap-1">
                    <Text variant="secondary" className="text-xs">
                      {t("versusSideB")}
                    </Text>
                    <Select
                      value={sideValue(slotB)}
                      onChange={(e) => setSide(index, 1, e.target.value)}
                      aria-label={t("versusSideBRound", { index: index + 1 })}
                      options={optionsForSide(index, 1)}
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
                        aria-label={t("versusPerSideRound", {
                          index: index + 1,
                        })}
                        className="h-[46px] w-[54px] text-center font-semibold text-acc tabular-nums"
                      />
                    </div>
                  )}
                </div>

                <Text variant="tertiary" className="text-xs">
                  {t("versusDrawHint", { a: drawA, b: drawB })}
                </Text>
                {singlePool && (
                  <Text variant="tertiary" role="status" className="text-xs">
                    {t("versusSamePoolNote")}
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
        onAddRound={addRound}
        bulk={
          isHeadToHead
            ? undefined
            : {
                label: t("versusSetAllLabel"),
                applyLabel: t("versusSetAll"),
                min: NXN_SIDE_COUNT_MIN,
                max: NXN_SIDE_COUNT_MAX,
                placeholder: "3",
                current: currentPerSide,
                allMatch: perSideAllMatch,
                onApply: (value) =>
                  rounds.forEach((_, index) => setPerSide(index, value)),
              }
        }
        note={isHeadToHead ? t("versusPerSideFixed") : undefined}
      />
    </section>
  );
}
