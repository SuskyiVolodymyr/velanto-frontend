"use client";

import { useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";

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
  const [draft, setDraft] = useState("");

  function apply() {
    if (!bulk) return;
    const value = Number(draft);
    if (draft === "" || Number.isNaN(value)) return;
    bulk.onApply(value);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={onAddRound}
        className="whitespace-nowrap"
      >
        {addLabel}
      </Button>
      {bulk ? (
        // shrink-0 with nowrap children: as a single flex item this group's
        // min-content width is tiny, because its own label and button would
        // happily wrap mid-phrase. Without it the group squeezes into whatever
        // space is left instead of the parent's flex-wrap moving it to its own
        // line — and since Button is fixed height, the extra lines spill out of
        // the button's box rather than growing it.
        <div className="flex shrink-0 items-center gap-2">
          <Text variant="secondary" className="whitespace-nowrap text-sm">
            {bulk.label}
          </Text>
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
            onClick={apply}
            className="whitespace-nowrap"
          >
            {bulk.applyLabel}
          </Button>
        </div>
      ) : (
        note && (
          <Text variant="secondary" className="text-sm">
            {note}
          </Text>
        )
      )}
    </div>
  );
}
