"use client";

import { useTranslations } from "next-intl";
import { useFormContext, useWatch } from "react-hook-form";
import { useAuth } from "@/src/shared/lib/auth-context";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { summarizePack } from "@/src/features/create/create-pack.summary";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

export interface CreatePreviewPanelProps {
  /**
   * Caller already knows create vs edit (see `CreatePackForm`'s own `mode`
   * prop) — this component never re-derives it.
   */
  mode: "create" | "edit";
}

/**
 * Live-updating right sidebar for the create/edit pack form: a cover
 * preview, a pool/element/round summary, and the single Publish/Save CTA
 * (per the redesign plan, this is the ONLY publish button on desktop —
 * two "Publish" buttons would break e2e strict-mode `getByRole` lookups).
 *
 * Must be rendered inside `CreatePackForm`'s `<form>` element (or otherwise
 * within the same `FormProvider`) — the CTA is a native `type="submit"`
 * button with no `onClick` of its own, so it relies on the surrounding
 * form's existing `onSubmit={handleSubmit((values) => onValid(values, false))}`
 * to actually publish/save, exactly like the form's current bottom Publish
 * button. Wiring it into that layout is a separate task; this component is
 * self-contained and only needs a `FormProvider<CreatePackValues>` ancestor.
 */
export function CreatePreviewPanel({ mode }: CreatePreviewPanelProps) {
  const t = useTranslations("create.preview");
  const tCreate = useTranslations("create");
  const tFormat = useTranslations("formats");
  const { control, formState } = useFormContext<CreatePackValues>();
  const { user } = useAuth();

  // A single whole-form subscription: the display fields (title, description,
  // coverTone, coverImageKey, format) come straight off it, and the same
  // object is handed to summarizePack for the pool/element/round counts.
  // useWatch({control}) types as DeepPartialSkipArrayKey<CreatePackValues>
  // (react-hook-form's static safety net for a mid-mount partial), but this
  // panel only ever mounts inside a form already seeded with full
  // defaultValues, so it is complete at runtime — hence the cast.
  const values = useWatch({ control }) as CreatePackValues;
  const { title, description, coverTone, coverImageKey, format } = values;
  const summary = summarizePack(values);

  const isEdit = mode === "edit";
  const blocked = !summary.canPublish;

  const ctaLabel = isEdit
    ? formState.isSubmitting
      ? tCreate("saving")
      : tCreate("saveChanges")
    : blocked
      ? t("publishBlocked")
      : t("publishReady");

  return (
    <div className="flex max-w-[380px] flex-col gap-[16px] lg:sticky lg:top-[82px]">
      <Text variant="tertiary" className="text-[12px] font-medium tracking-[0.14em]">
        {t("eyebrow")}
      </Text>

      <div className="overflow-hidden rounded-[16px] border border-border bg-surface-card">
        <div
          className="relative aspect-[4/3]"
          style={{
            background: `linear-gradient(158deg, ${coverTone}, #0b0c0f 76%)`,
          }}
        >
          {coverImageKey && <CoverImage coverKey={coverImageKey} />}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(122deg, rgba(255,255,255,.028) 0 1px, transparent 1px 15px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, rgba(9,10,13,.72), transparent 52%)",
            }}
          />
          {/*
            Built by hand rather than via <Badge variant="overlay"> — Badge's
            own text-[11px]/tracking-[0.04em] would sit at equal specificity
            against the 10.5px/tracking-[0.1em] this pill needs, and cn() is a
            plain join (not tailwind-merge, see Text.tsx), so whichever utility
            the Tailwind build happens to emit last would silently win. The
            classes below are Badge's own "overlay" variant values, inlined.
          */}
          <span className="absolute start-2.5 top-2.5 inline-flex items-center rounded-pill bg-black/55 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/95 backdrop-blur-sm">
            {tFormat(format)}
          </span>
          <span className="absolute end-2.5 top-2.5 text-[11px] text-foreground-secondary">
            {t("roundsCount", { count: summary.roundCount })}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <Text
              as="h3"
              className="text-[20px] font-semibold leading-[1.08] text-white/95"
            >
              {title.trim() ? title : t("untitled")}
            </Text>
          </div>
        </div>
        <div className="flex flex-col gap-[10px] p-[15px_16px_16px]">
          <Text variant="secondary" className="min-h-[20px] text-[13px]">
            {description.trim() ? description : t("noDescription")}
          </Text>
          {user && (
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-[17px] w-[17px] shrink-0 rounded-full"
                style={{ background: coverTone }}
              />
              <Text variant="secondary" className="text-[13px]">
                @{user.username}
              </Text>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-tile border border-border bg-surface-card p-[16px_18px]">
        {(
          [
            { label: t("format"), value: tFormat(format) },
            { label: t("pools"), value: summary.poolCount },
            { label: t("elements"), value: summary.elementCount },
            { label: t("rounds"), value: summary.roundCount },
          ] as const
        ).map((row, index, rows) => (
          <div
            key={row.label}
            className={cn(
              "flex justify-between py-2",
              index < rows.length - 1 && "border-b border-border",
            )}
          >
            <Text variant="secondary" className="text-[13px]">
              {row.label}
            </Text>
            <Text className="text-[13px] font-medium tabular-nums">
              {row.value}
            </Text>
          </div>
        ))}
      </div>

      <button
        type="submit"
        // Blocked is a display gate only (mirrors the zod schema's cheapest
        // preconditions, see create-pack.summary.ts) — never native `disabled`,
        // so a blocked click still submits and surfaces the real per-field
        // zod errors instead of dead-ending. Matches the JoinRoomCard anon-gate
        // precedent (D1b-ii). Edit mode never blocks: the existing "Save
        // changes" submit always runs the real validation on click.
        aria-disabled={!isEdit && blocked ? "true" : undefined}
        className={cn(
          "h-[48px] w-full rounded-[12px] transition-colors",
          !isEdit && blocked
            ? "border border-border bg-white/[0.04] text-foreground-tertiary cursor-not-allowed"
            : "bg-acc font-semibold text-[#0a0b0e] hover:brightness-110",
        )}
      >
        {ctaLabel}
      </button>

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
