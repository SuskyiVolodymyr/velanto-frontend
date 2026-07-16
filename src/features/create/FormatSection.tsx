"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { PackFormat } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { type CreatePackValues } from "@/src/features/create/create-pack.schema";

// Each option's display name comes from the shared `formats` namespace (keyed by
// the format value); the blurb is a create-form-only key.
const FORMAT_OPTIONS: { value: PackFormat; blurbKey: string }[] = [
  { value: "save_one", blurbKey: "blurbSaveOne" },
  { value: "sacrifice_one", blurbKey: "blurbSacrificeOne" },
  { value: "nxn", blurbKey: "blurbNxn" },
  { value: "rank_blind", blurbKey: "blurbRankBlind" },
  { value: "1v1", blurbKey: "blurb1v1" },
];

/**
 * The "Format" section: the segmented picker that sets `format` in the shared
 * react-hook-form state, which in turn drives whether the Groups or Categories
 * body is shown by the parent form.
 */
export function FormatSection() {
  const t = useTranslations("create");
  const tFormat = useTranslations("formats");
  const { control, setValue } = useFormContext<CreatePackValues>();
  const format = useWatch({ control, name: "format" });

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("formatHeading")}
      </Text>
      {/* 5-across on desktop; wraps to 2 (then 3) columns on smaller screens so
          the cards never overflow the viewport on a phone. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {FORMAT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setValue("format", option.value)}
            aria-pressed={format === option.value}
            className={cn(
              "cursor-pointer rounded-[12px] border px-4 py-3 text-start transition-colors",
              format === option.value
                ? "border-acc/40 bg-acc/5"
                : "border-border bg-white/[0.02]",
            )}
          >
            <Text className="font-semibold">{tFormat(option.value)}</Text>
            <Text variant="secondary" className="mt-1 text-xs">
              {t(option.blurbKey)}
            </Text>
          </button>
        ))}
      </div>
    </section>
  );
}
