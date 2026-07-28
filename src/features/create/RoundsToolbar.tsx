"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { cn } from "@/src/shared/lib/cn";

export interface RoundsBulkCount {
  /** Names what the number sets, beside the field. */
  label: string;
  /** The apply button's own label. */
  applyLabel: string;
  min: number;
  max: number;
  placeholder: string;
  /** Called with the parsed number; never with NaN, never with nothing typed. */
  onApply: (value: number) => void;
  /**
   * The rounds' current shared count — the caller's own representative read
   * (e.g. the first round's), used to seed the live stepper display. Absent
   * when there's nothing to represent yet (no rounds).
   */
  current: number;
  /**
   * True when every round this bulk action would touch already has the same
   * count as `current`. Drives the Apply button's amber "drifted" flag — off
   * (nothing to reconcile) once every round agrees.
   */
  allMatch: boolean;
}

/**
 * The row under a pack's rounds: add another, and set one count across all of
 * them at once.
 *
 * Shared by RoundsEditor and VersusEditor, which each had their own copy — same
 * layout, same draft state, same empty/NaN guard, differing only in copy and
 * limits. That duplication was not free: #351 fixed this row wrapping mid-phrase
 * in one editor and the identical break stayed live in the other (#359).
 *
 * The draft value lives here rather than in the caller: it is display state for
 * this control, not part of the pack being edited, and both callers were
 * carrying it plus the same parse guard.
 */
export function RoundsToolbar({
  addLabel,
  onAddRound,
  bulk,
  note,
}: {
  addLabel: string;
  onAddRound: () => void;
  /** Omitted when the format has nothing to bulk-set — pass `note` instead. */
  bulk?: RoundsBulkCount;
  /** Shown in place of the controls (1v1's per-side count is locked to 1). */
  note?: string;
}) {
  const t = useTranslations("create");
  // Seeded once from the caller's live representative count — after that this
  // is a local PENDING value the +/- buttons and direct typing both adjust;
  // it doesn't keep resyncing to `bulk.current` on every render (that would
  // fight whatever the author is mid-typing). Apply is the explicit action
  // that actually writes it back to every round.
  const [draft, setDraft] = useState(() =>
    bulk ? String(bulk.current) : "",
  );

  function apply() {
    if (!bulk) return;
    const value = Number(draft);
    if (draft === "" || Number.isNaN(value)) return;
    bulk.onApply(value);
  }

  function step(delta: number) {
    if (!bulk) return;
    const current = Number(draft);
    const base = Number.isNaN(current) ? bulk.current : current;
    const next = Math.min(bulk.max, Math.max(bulk.min, base + delta));
    setDraft(String(next));
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onAddRound}
        className="flex h-[46px] w-full items-center justify-center rounded-control border border-dashed border-white/[0.14] text-sm font-semibold text-foreground-secondary transition-colors hover:border-acc hover:text-foreground"
      >
        {addLabel}
      </button>
      {bulk ? (
        // shrink-0 with nowrap children: as a single flex item this group's
        // min-content width is tiny, because its own label and button would
        // happily wrap mid-phrase. Without it the group squeezes into whatever
        // space is left instead of the parent's flex-wrap moving it to its own
        // line — and since Button is fixed height, the extra lines spill out of
        // the button's box rather than growing it.
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Text variant="tertiary" className="whitespace-nowrap text-[13px]">
              {bulk.label}
            </Text>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                disabled={Number(draft) <= bulk.min}
                onClick={() => step(-1)}
                aria-label={t("decreaseCount")}
                className="h-8 w-8 px-0"
              >
                −
              </Button>
              <Input
                type="number"
                min={bulk.min}
                max={bulk.max}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                // Named by the text beside it, which says what the number means
                // ("Items per side, all rounds"), not by the button's "Set for all".
                aria-label={bulk.label}
                placeholder={bulk.placeholder}
                className="w-16 text-center"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={Number(draft) >= bulk.max}
                onClick={() => step(1)}
                aria-label={t("increaseCount")}
                className="h-8 w-8 px-0"
              >
                +
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={apply}
              className={cn(
                "whitespace-nowrap",
                // Flags that the rounds have drifted apart from each other —
                // there's something for this button to actually reconcile.
                // Same amber token StatusBadge/report-display use for a
                // "needs a look" state (--status-pending, distinct from the
                // game --score amber).
                !bulk.allMatch &&
                  "border border-status-pending/30 bg-status-pending/10 text-status-pending hover:bg-status-pending/20",
              )}
            >
              {bulk.applyLabel}
            </Button>
          </div>
        </div>
      ) : (
        note && (
          <Text variant="tertiary" className="text-[13px]">
            {note}
          </Text>
        )
      )}
    </div>
  );
}
