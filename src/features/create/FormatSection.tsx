"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { PackFormat } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { type CreatePackValues } from "@/src/features/create/create-pack.schema";

const FORMAT_OPTIONS: { value: PackFormat; title: string; blurb: string }[] = [
  {
    value: "save_one",
    title: "Save One",
    blurb: "Show a group, keep one to advance.",
  },
  {
    value: "sacrifice_one",
    title: "Sacrifice One",
    blurb: "Remove one at a time; a favorite remains.",
  },
  {
    value: "nxn",
    title: "NxN",
    blurb: "Two categories compared side by side.",
  },
  {
    value: "rank_blind",
    title: "Rank Blind",
    blurb: "Place each pick blind into a growing ranked list.",
  },
  {
    value: "1v1",
    title: "1v1",
    blurb: "Pick a winner in each head-to-head matchup.",
  },
];

/**
 * The "Format" section: the segmented picker that sets `format` in the shared
 * react-hook-form state, which in turn drives whether the Groups or Categories
 * body is shown by the parent form.
 */
export function FormatSection() {
  const { control, setValue } = useFormContext<CreatePackValues>();
  const format = useWatch({ control, name: "format" });

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        Format
      </Text>
      <div className="flex gap-2">
        {FORMAT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setValue("format", option.value)}
            aria-pressed={format === option.value}
            className={cn(
              "flex-1 rounded-[12px] border px-4 py-3 text-left transition-colors",
              format === option.value
                ? "border-acc/40 bg-acc/5"
                : "border-border bg-white/[0.02]",
            )}
          >
            <Text className="font-semibold">{option.title}</Text>
            <Text variant="secondary" className="mt-1 text-xs">
              {option.blurb}
            </Text>
          </button>
        ))}
      </div>
    </section>
  );
}
