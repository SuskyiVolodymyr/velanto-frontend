"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { versusRounds } from "@/src/features/create/create-pack.defaults";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { Text } from "@/src/shared/components/Text";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import {
  type CreatePackValues,
  NXN_SIDE_COUNT_MIN,
  NXN_SIDE_COUNT_MAX,
} from "@/src/features/create/create-pack.schema";

/**
 * The versus-format body (nxn / 1v1): two distinct pools face off across a fixed
 * number of rounds. The editor holds NO local state — every control derives from
 * the current `rounds` and, on change, regenerates the whole `rounds` array via
 * {@link versusRounds}. 1v1 pins the per-side count to 1 (no input).
 */
export function VersusEditor() {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { errors } = formState;
  const format = useWatch({ control, name: "format" });
  const groups = useWatch({ control, name: "groups" });
  const rounds = useWatch({ control, name: "rounds" });

  const isHeadToHead = format === "1v1";

  // Derive the editor's current values entirely from `rounds`, falling back to
  // the first two pools before the rounds have been shaped.
  const aId = rounds[0]?.slots[0]?.groupId ?? groups[0]?.id ?? "";
  const bId =
    rounds[0]?.slots[1]?.groupId ?? groups[1]?.id ?? groups[0]?.id ?? "";
  const roundCount = rounds.length;
  const perSide = isHeadToHead
    ? 1
    : (rounds[0]?.slots[0]?.count ?? NXN_SIDE_COUNT_MIN);

  function regenerate(
    nextA: string,
    nextB: string,
    nextRoundCount: number,
    nextPerSide: number,
  ) {
    setValue(
      "rounds",
      versusRounds(
        nextA,
        nextB,
        nextRoundCount,
        isHeadToHead ? 1 : nextPerSide,
      ),
      { shouldValidate: false, shouldDirty: true },
    );
  }

  const poolOptions = groups.map((group, index) => ({
    value: group.id,
    label: group.name.trim() || t("groupName", { index: index + 1 }),
  }));

  const roundsError = getFieldError(errors, "rounds");
  const slotError =
    getFieldError(errors, "rounds.0.slots") ??
    getFieldError(errors, "rounds.0.slots.0.count");

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("matchupHeading")}
      </Text>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <Text variant="secondary" className="text-xs">
            {t("versusSideA")}
          </Text>
          <Select
            value={aId}
            onChange={(e) =>
              regenerate(e.target.value, bId, roundCount, perSide)
            }
            aria-label={t("versusSideA")}
            options={poolOptions}
          />
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <Text variant="secondary" className="text-xs">
            {t("versusSideB")}
          </Text>
          <Select
            value={bId}
            onChange={(e) =>
              regenerate(aId, e.target.value, roundCount, perSide)
            }
            aria-label={t("versusSideB")}
            options={poolOptions}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[120px] flex-1 flex-col gap-1">
          <Text variant="secondary" className="text-xs">
            {t("versusRoundCount")}
          </Text>
          <Input
            type="number"
            min={1}
            value={roundCount || ""}
            onChange={(e) =>
              regenerate(
                aId,
                bId,
                e.target.value === "" ? 0 : Number(e.target.value),
                perSide,
              )
            }
            aria-label={t("versusRoundCount")}
          />
        </div>
        <div className="flex min-w-[120px] flex-1 flex-col gap-1">
          <Text variant="secondary" className="text-xs">
            {t("versusPerSide")}
          </Text>
          {isHeadToHead ? (
            <Text className="flex h-11 items-center">
              {t("versusPerSideFixed")}
            </Text>
          ) : (
            <Input
              type="number"
              min={NXN_SIDE_COUNT_MIN}
              max={NXN_SIDE_COUNT_MAX}
              value={perSide || ""}
              onChange={(e) =>
                regenerate(
                  aId,
                  bId,
                  roundCount,
                  e.target.value === "" ? 0 : Number(e.target.value),
                )
              }
              aria-label={t("versusPerSide")}
            />
          )}
        </div>
      </div>

      {slotError && (
        <Text role="alert" className="text-sm text-danger">
          {slotError}
        </Text>
      )}
      {roundsError && (
        <Text role="alert" className="text-sm text-danger">
          {roundsError}
        </Text>
      )}
    </section>
  );
}
