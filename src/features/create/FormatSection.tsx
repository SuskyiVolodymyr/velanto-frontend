"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { PackFormat } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { StepHeader } from "@/src/features/create/StepHeader";
import { FormatGlyph } from "@/src/features/create/FormatGlyph";
import { type CreatePackValues } from "@/src/features/create/create-pack.schema";

// Each option's display name comes from the shared `formats` namespace (keyed by
// the format value); the blurb is a create-form-only key. Every one of the five
// formats is creatable, each with its own editor body (RoundsEditor /
// VersusEditor) selected by the parent form. Order matches the real mock
// (Create Pack.dc.html, DesignSync 67c2561f-a9ab-433b-a48b-d1a3e2aa88d8):
// save_one, sacrifice_one, 1v1, nxn, rank_blind.
const FORMAT_OPTIONS: { value: PackFormat; blurbKey: string }[] = [
  { value: "save_one", blurbKey: "blurbSaveOne" },
  { value: "sacrifice_one", blurbKey: "blurbSacrificeOne" },
  { value: "1v1", blurbKey: "blurb1v1" },
  { value: "nxn", blurbKey: "blurbNxn" },
  { value: "rank_blind", blurbKey: "blurbRankBlind" },
];

/**
 * The "Format" section: the segmented picker that sets `format` in the shared
 * react-hook-form state, which in turn drives whether the Groups or Categories
 * body is shown by the parent form.
 */
export function FormatSection({
  // Edit mode locks the picker: the hint text says format can't change once
  // the pack is published (T3), and `CreatePackForm.onValid` sends the
  // current format on every PATCH — without this gate that copy would be
  // false, and picking a different format mid-edit would also silently swap
  // out the author's existing rounds via the family-switch effect below.
  locked = false,
}: {
  locked?: boolean;
}) {
  const t = useTranslations("create");
  const tFormat = useTranslations("formats");
  const { control, setValue } = useFormContext<CreatePackValues>();
  const format = useWatch({ control, name: "format" });

  return (
    <section className="flex flex-col gap-3">
      <StepHeader step={1} title={t("formatHeading")} hint={t("formatHint")} />
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))" }}
      >
        {FORMAT_OPTIONS.map((option) => {
          const selected = format === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={locked && !selected}
              onClick={() => {
                if (locked) return;
                setValue("format", option.value);
              }}
              aria-pressed={selected}
              // The selected tile stays natively enabled (see `disabled`
              // above — it needs to render un-dimmed and legible), so it
              // needs its own `aria-disabled` to tell an AT user activating
              // it is a no-op; the other tiles already say so via `disabled`.
              aria-disabled={locked && selected ? "true" : undefined}
              title={locked ? t("formatLockedTooltip") : undefined}
              className={cn(
                "flex flex-col gap-3 rounded-tile border p-4 text-start transition-colors",
                locked
                  ? "cursor-not-allowed disabled:opacity-45"
                  : "cursor-pointer",
                selected
                  ? "border-acc bg-white/[0.055]"
                  : "border-border bg-surface-card",
              )}
            >
              <FormatGlyph format={option.value} selected={selected} />
              <div>
                <Text className="text-[15px] font-semibold">
                  {tFormat(option.value)}
                </Text>
                <Text
                  variant="secondary"
                  className="mt-[3px] text-[12.5px] leading-[1.45]"
                >
                  {t(option.blurbKey)}
                </Text>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
