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
import {
  RoundsBulkBar,
  RoundsAddButton,
} from "@/src/features/create/RoundsToolbar";
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
  // Feeds RoundsBulkBar's live stepper + "drifted" flag — every round's own
  // per-side count (both its sides already share one, via setPerSide).
  const perSideCounts = rounds.map(
    (round) => round.slots[0]?.count ?? NXN_SIDE_COUNT_MIN,
  );

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
      groups[poolIndex]?.name.trim() ||
      // -1 (no match — reachable only transiently mid format-family-switch)
      // must not render as "Pool 0 name".
      t("groupName", { index: Math.max(0, poolIndex) + 1 })
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {/* Same heading + hint as RoundsEditor (both editors converged on one
          consistent "Rounds" label per the real mock) — VersusEditor used to
          say "Matchup" with no hint. */}
      <StepHeader title={t("roundsHeading")} hint={t("roundsHint")} />

      {/* Mock: this bar sits right under the section header, before the
          round list — see RoundsEditor's identical comment. */}
      <RoundsBulkBar
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
                counts: perSideCounts,
                onApply: (value) =>
                  rounds.forEach((_, index) => setPerSide(index, value)),
              }
        }
        note={isHeadToHead ? t("versusPerSideFixed") : undefined}
      />

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
              // Compares against `expanded` (already resolved through
              // `effectiveExpandedId`), not the raw state — see
              // RoundsEditor's identical comment: right after a
              // format-family switch, `expandedRoundId` still holds the
              // STALE id while round 1 shows expanded via the fallback, so
              // comparing against the raw state would make the first click
              // on round 1's own header re-pin it instead of collapsing it.
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
                  {matchupLabel} · {t("versusDrawHint", { a: drawA, b: drawB })}
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

            {!expanded && slotError && (
              <Text variant="danger" role="alert" className="ms-[37px] text-sm">
                {slotError}
              </Text>
            )}

            {expanded && (
              // Mock: nested cyan-bordered #0F1116 sub-panel, matching
              // RoundsEditor's identical fix — see its comment for why.
              <div className="flex flex-col gap-[13px] rounded-[13px] border border-acc/35 bg-[#0F1116] p-[14px]">
                <div className="flex flex-col gap-1">
                  <Text
                    variant="tertiary"
                    className="text-[11.5px] font-semibold"
                  >
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
                    placeholder={t("versusRoundNamePlaceholder")}
                  />
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-[130px] flex-1 flex-col gap-1">
                    <Text
                      variant="tertiary"
                      className="text-[11.5px] font-semibold"
                    >
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
                    <Text
                      variant="tertiary"
                      className="text-[11.5px] font-semibold"
                    >
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
                    // Real stepper, not a bare number input — see
                    // RoundsEditor's identical fix/comment (same `cn()`
                    // append-not-override collision with Input's own
                    // `w-full` rendered this as a huge, uncapped-width box).
                    <div className="flex w-[150px] flex-none flex-col gap-1">
                      <Text
                        variant="tertiary"
                        className="text-[11.5px] font-semibold"
                      >
                        {t("versusPerSide")}
                      </Text>
                      <div className="flex h-10 items-center gap-[9px] rounded-control border border-white/10 bg-surface-card px-[6px]">
                        <button
                          type="button"
                          onClick={() =>
                            setPerSide(
                              index,
                              Math.max(
                                NXN_SIDE_COUNT_MIN,
                                (slotA?.count ?? NXN_SIDE_COUNT_MIN) - 1,
                              ),
                            )
                          }
                          aria-label={t("decreaseCount")}
                          className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-foreground-secondary transition-colors hover:bg-white/[0.08] hover:text-foreground"
                        >
                          −
                        </button>
                        <input
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
                          className="min-w-0 flex-1 border-0 bg-transparent text-center text-[15px] font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPerSide(
                              index,
                              Math.min(
                                NXN_SIDE_COUNT_MAX,
                                (slotA?.count ?? NXN_SIDE_COUNT_MIN) + 1,
                              ),
                            )
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

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <div className="flex flex-col gap-1">
                    <Text variant="tertiary" className="text-xs">
                      {t("versusDrawHint", { a: drawA, b: drawB })}
                    </Text>
                    {singlePool && (
                      <Text
                        variant="tertiary"
                        role="status"
                        className="text-xs"
                      >
                        {t("versusSamePoolNote")}
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
                          // Expand whichever survivor now sits in the removed
                          // round's place — see RoundsEditor's identical
                          // comment (the Remove control only ever removes the
                          // expanded round, so leaving `expandedRoundId` at
                          // its old value would collapse everything).
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
                      // Distinct accessible name from the visible "Done"
                      // label — see RoundsEditor's identical comment (avoids
                      // colliding with the tag picker's own "Done" button).
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

      <RoundsAddButton addLabel={t("addRound")} onAddRound={addRound} />
    </section>
  );
}
