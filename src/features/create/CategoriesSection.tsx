"use client";

import { useFormContext, useWatch, type FieldErrors } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/src/shared/components/Input";
import { Text } from "@/src/shared/components/Text";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import { CategoryEditor } from "@/src/features/create/CategoryEditor";
import {
  type CreatePackValues,
  MIN_VERSUS_ROUNDS,
  MAX_VERSUS_ROUNDS,
  MIN_VERSUS_N,
  MAX_VERSUS_N,
} from "@/src/features/create/create-pack.schema";

function firstCategoryError(
  errors: FieldErrors<CreatePackValues>,
  index: number,
): string | undefined {
  return (
    getFieldError(errors, `categories.${index}.name`) ??
    getFieldError(errors, `categories.${index}.items`)
  );
}

/**
 * The nxn body: exactly CATEGORY_COUNT fixed categories (no add/remove UI, so a
 * field array isn't needed — `setValue` on each index is enough) plus the
 * pack-level versusRounds / versusN inputs.
 */
export function CategoriesSection() {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { errors } = formState;
  const categories = useWatch({ control, name: "categories" });
  const versusRounds = useWatch({ control, name: "versusRounds" });
  const versusN = useWatch({ control, name: "versusN" });

  const categoriesError = getFieldError(errors, "categories");
  const versusRoundsError = getFieldError(errors, "versusRounds");
  const versusNError = getFieldError(errors, "versusN");

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("categoriesHeading")}
      </Text>
      {categories.map((category, index) => (
        <CategoryEditor
          key={category.id}
          category={category}
          index={index}
          onChange={(next) =>
            setValue(`categories.${index}`, next, {
              shouldValidate: false,
              shouldDirty: true,
            })
          }
          error={firstCategoryError(errors, index)}
        />
      ))}
      {categoriesError && (
        <Text role="alert" className="text-sm text-[#ff6b6b]">
          {categoriesError}
        </Text>
      )}
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Input
            type="number"
            min={MIN_VERSUS_ROUNDS}
            max={MAX_VERSUS_ROUNDS}
            value={versusRounds ?? ""}
            onChange={(e) =>
              setValue(
                "versusRounds",
                e.target.value === "" ? undefined : Number(e.target.value),
                {
                  shouldValidate: false,
                },
              )
            }
            placeholder={t("rounds")}
            aria-label={t("rounds")}
          />
          {versusRoundsError && (
            <Text role="alert" className="text-sm text-[#ff6b6b]">
              {versusRoundsError}
            </Text>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Input
            type="number"
            min={MIN_VERSUS_N}
            max={MAX_VERSUS_N}
            value={versusN ?? ""}
            onChange={(e) =>
              setValue(
                "versusN",
                e.target.value === "" ? undefined : Number(e.target.value),
                {
                  shouldValidate: false,
                },
              )
            }
            placeholder={t("itemsPerRound")}
            aria-label={t("itemsPerRound")}
          />
          {versusNError && (
            <Text role="alert" className="text-sm text-[#ff6b6b]">
              {versusNError}
            </Text>
          )}
        </div>
      </div>
    </section>
  );
}
