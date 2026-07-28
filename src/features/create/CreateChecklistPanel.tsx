"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { COVER_TONES } from "@/src/shared/types/pack";
import { summarizePack } from "@/src/features/create/create-pack.summary";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

export interface CreateChecklistPanelProps {
  /** The whole live form value, already watched by the caller (CreatePackForm
   * holds the one whole-form `useWatch` subscription this panel and the
   * sticky bar's blocked-tooltip both derive from). */
  values: CreatePackValues;
}

// The real mock (Create Pack.dc.html, DesignSync 67c2561f-a9ab-433b-a48b-
// d1a3e2aa88d8) also has a "Friend modes unlocked" / feasibility panel here
// (SCORED — Claim / Voting / Turn-based cut / Guess Who / Shared-grid-Relay).
// That is DELIBERATELY not built: it maps to room modes from the
// still-dormant multiplayer rooms epic (`friends-rooms-client.create` 503s in
// prod — see the root CLAUDE.md's "save_one_friends was retired" section).
// If you're looking for it, it was omitted on purpose, not missed.

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
  const summary = summarizePack(values);
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
    <div className="flex max-w-[380px] flex-col gap-[16px] lg:sticky lg:top-[82px]">
      <div className="rounded-card border border-border bg-surface-card p-[16px_18px]">
        <Text
          variant="tertiary"
          className="mb-3 text-[12px] font-medium tracking-[0.14em]"
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
