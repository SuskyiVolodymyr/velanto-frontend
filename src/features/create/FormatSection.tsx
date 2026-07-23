"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { PackFormat } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { type CreatePackValues } from "@/src/features/create/create-pack.schema";

// Each option's display name comes from the shared `formats` namespace (keyed by
// the format value); the blurb is a create-form-only key. Every one of the six
// formats is creatable, each with its own editor body (RoundsEditor /
// FriendsRoundsEditor / VersusEditor) selected by the parent form.
const FORMAT_OPTIONS: { value: PackFormat; blurbKey: string }[] = [
  { value: "save_one", blurbKey: "blurbSaveOne" },
  { value: "sacrifice_one", blurbKey: "blurbSacrificeOne" },
  { value: "save_one_friends", blurbKey: "blurbSaveOneFriends" },
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
      {/* 3-across on desktop (six formats ⇒ two tidy rows); wraps to 2 columns
          on a phone so the cards never overflow the viewport. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
