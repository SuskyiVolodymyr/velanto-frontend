"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { COVER_TONES } from "@/src/shared/types/pack";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

export interface CreateChecklistPanelProps {
  /** The whole live form value, already watched by the caller (CreatePackForm
   * holds the one whole-form `useWatch` subscription this panel and the
   * sticky bar's blocked-tooltip both derive from). */
  values: CreatePackValues;
}

/**
 * The "Before you submit" checklist that replaced the old live-preview aside
 * (cover thumbnail, LIVE PREVIEW eyebrow, Format/Pools/Elements/Rounds stat
 * table, and the desktop-only Publish CTA — none of that exists in the real
 * mock). Every row is derived from form state already in scope; there is no
 * new data and no submit control here anymore — the sticky bar in
 * `CreatePackForm` is the only submit control now, at every breakpoint.
 */
export function CreateChecklistPanel({ values }: CreateChecklistPanelProps) {
  const t = useTranslations("create.checklist");
  const poolsWithItems = values.groups.filter(
    (group) => group.items.length > 0,
  ).length;
  // Mirrors CoverImageField/CreatePreviewPanel's own "is there a cover"
  // reads: a real image key, or a tone the author actually chose over the
  // form's default swatch. The mock's own fake-data script always renders
  // this row false — a stub that never reads real state — so it is NOT
  // ported; this wires the real thing instead (per the plan's T2 Step 2).
  const hasCover =
    Boolean(values.coverImageKey) || values.coverTone !== COVER_TONES[0];

  const rows: { key: string; label: string; done: boolean }[] = [
    // Every format has a default, so this is always true by the time the
    // panel can even render — kept as an explicit row because the mock has
    // it, and a future format without a hard default would make it real.
    { key: "format", label: t("formatChosen"), done: true },
    {
      key: "title",
      label: t("titleWritten"),
      done: Boolean(values.title?.trim()),
    },
    {
      key: "pools",
      label: t("poolsWithItems", { count: poolsWithItems }),
      done: poolsWithItems > 0,
    },
    { key: "cover", label: t("coverImage"), done: hasCover },
  ];

  return (
    // No max-w, no sticky here — CreatePackForm's aside slot already
    // constrains this (`max-w-[380px] flex-1 basis-[320px]`) and now owns the
    // sticky positioning for the whole aside stack (this panel + the
    // feasibility panel above it), matching the mock's own single
    // `position:sticky` on the aside container, not one per panel.
    <div className="flex flex-col gap-[16px]">
      <div className="rounded-card border border-border bg-surface-card p-[16px_18px]">
        <Text
          variant="tertiary"
          // `uppercase` (matching ResultHero's own eyebrow) rather than
          // typing every locale's translation in caps — a CSS transform is a
          // no-op on non-cased scripts (ar/ur/hi/bn/zh) and keeps en/ru/uk
          // consistent with each other instead of depending on whether that
          // locale's translator happened to shout the string.
          className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em]"
        >
          {t("eyebrow")}
        </Text>
        <ul className="flex flex-col gap-[10px]">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
                  row.done
                    ? "border-acc bg-acc/20 text-acc"
                    : "border-border text-transparent",
                )}
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <Text
                variant={row.done ? "secondary" : "tertiary"}
                className="text-[13px]"
              >
                {row.label}
              </Text>
              <span className="sr-only">
                {row.done ? t("rowDone") : t("rowNotDone")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span
          aria-hidden
          className="h-[6px] w-[6px] rounded-full bg-acc animate-livedot"
        />
        <Text variant="tertiary" className="text-[12px]">
          {t("noAiNote")}
        </Text>
      </div>
    </div>
  );
}
