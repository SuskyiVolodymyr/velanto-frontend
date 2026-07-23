"use client";

import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import {
  newFriendsRound,
  friendsSlot,
  friendsRandomPoolSlot,
} from "@/src/features/create/create-pack.defaults";
import {
  RANDOM_POOL_VALUE,
  availablePoolCount,
} from "@/src/features/create/random-pool-option";
import {
  type CreatePackValues,
  FRIENDS_ROUND_DRAW,
} from "@/src/features/create/create-pack.schema";

/**
 * The save_one_friends body: an ordered list of single-slot rounds, each drawing
 * one pool. Unlike the elimination editor there is NO count input and NO manual
 * pinning — the room shows one item per player plus one (up to
 * {@link FRIENDS_ROUND_DRAW}), a size fixed only when the room fills, so every
 * pool must hold a full board. Each round can instead pick its pool at random
 * (chosen at play time), same as the other editors.
 */
export function FriendsRoundsEditor() {
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

  const firstGroupId = groups[0]?.id ?? "";
  // Friends rounds carry no count, so hand the draw engine the size the room
  // will use — the live "draws N" hint then mirrors what a full room draws
  // (rounds sharing a pool don't reuse items).
  const drawRounds = rounds.map((round) => ({
    ...round,
    slots: round.slots.map((slot) => ({ ...slot, count: FRIENDS_ROUND_DRAW })),
  }));
  const resolved = resolveRoundDraws(groups, drawRounds);
  const roundsError = getFieldError(errors, "rounds");

  // Choosing a pool replaces the whole slot: a named pool or a play-time random
  // one, both with no count/itemIds (a friends round never authors them).
  function changeGroup(roundIndex: number, value: string) {
    setValue(
      `rounds.${roundIndex}.slots.0`,
      value === RANDOM_POOL_VALUE
        ? friendsRandomPoolSlot()
        : friendsSlot(value),
      { shouldValidate: false, shouldDirty: true },
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("roundsHeading")}
      </Text>
      <Text variant="secondary" className="text-sm">
        {t("friendsHint", { count: FRIENDS_ROUND_DRAW })}
      </Text>

      {rounds.map((round, index) => {
        const slot = round.slots[0];
        const randomPool = slot.groupMode === "random";
        const drawnCount = resolved[index]?.slots[0]?.drawnCount ?? 0;
        const slotError =
          getFieldError(errors, `rounds.${index}.slots.0`) ??
          getFieldError(errors, `rounds.${index}.slots.0.groupId`) ??
          getFieldError(errors, `rounds.${index}.slots`);

        return (
          <Card
            key={round.id}
            className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none"
          >
            <div className="flex flex-col gap-1">
              <Text variant="tertiary" className="text-xs">
                {t("roundGroup")}
              </Text>
              <Select
                value={randomPool ? RANDOM_POOL_VALUE : (slot.groupId ?? "")}
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
                    label: g.name.trim() || t("groupName", { index: gi + 1 }),
                  })),
                ]}
              />
            </div>

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

      <Button
        variant="secondary"
        type="button"
        onClick={() => roundsArray.append(newFriendsRound(firstGroupId))}
        className="self-start"
      >
        {t("addRound")}
      </Button>
    </section>
  );
}
