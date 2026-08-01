"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export interface RoundsBulkCount {
  /** Names what the number sets, beside the field. */
  label: string;
  /** The apply button's own label (shown while the rounds have drifted apart). */
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
   * Every round's own count this bulk action would touch, in round order.
   * Whether the rounds have "drifted" is judged against the live stepper
   * value (mock: `applyDisabled` compares each round to the CURRENT
   * `globalCount`, i.e. whatever the stepper shows right now, not a stale
   * snapshot) — so adjusting the stepper away from what every round already
   * has immediately re-enables Apply, even before it's clicked.
   */
  counts: number[];
}

/**
 * The bulk "set one count across every round" bar — sits at the TOP of the
 * Rounds section (mock: right under the section header, before the round
 * list), not docked at the bottom beside the add-round button. Shared by
 * RoundsEditor and VersusEditor.
 *
 * Mock: a two-column card — a bold label plus a descriptive hint line on the
 * left, the stepper and Apply button pushed to the right edge. The label,
 * count, and Apply button all pick up the amber/cyan "drifted" treatment
 * together, and Apply itself reads "Applied" and disables once every round
 * already agrees — there's nothing left for it to do.
 */
export function RoundsBulkBar({
  bulk,
  note,
}: {
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

  if (!bulk) {
    return (
      note && (
        <Text variant="tertiary" className="text-[13px]">
          {note}
        </Text>
      )
    );
  }

  const draftNum = Number(draft);
  // Matches the mock's own logic: Apply disables once every round already
  // equals the STEPPER's current value, not some earlier snapshot — so
  // nudging the stepper away from what every round shares re-enables Apply
  // immediately, before it's ever clicked.
  const allMatch =
    draft !== "" &&
    !Number.isNaN(draftNum) &&
    bulk.counts.every((c) => c === draftNum);
  const varyList = [...new Set(bulk.counts)].sort((a, b) => a - b).join(", ");
  const hint = allMatch
    ? t("bulkCountHintMatch")
    : t("bulkCountHintDrift", { list: varyList });
  const driftedColor = allMatch ? undefined : "#ffd27a";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border bg-surface-card p-[13px]">
      <div className="flex min-w-0 flex-col gap-[2px]">
        <Text
          className="text-[13px] font-semibold"
          style={driftedColor ? { color: driftedColor } : undefined}
        >
          {bulk.label}
        </Text>
        <Text variant="tertiary" className="text-[11.5px] text-pretty">
          {hint}
        </Text>
      </div>
      <div className="ms-auto flex flex-none items-center gap-[9px]">
        <button
          type="button"
          disabled={Number(draft) <= bulk.min}
          onClick={() => step(-1)}
          aria-label={t("decreaseCount")}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-white/10 bg-background text-foreground-secondary transition-colors hover:border-white/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          −
        </button>
        <input
          type="number"
          min={bulk.min}
          max={bulk.max}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          // Named by the text beside it, which says what the number means
          // ("Items per side, all rounds"), not by the button's "Apply".
          aria-label={bulk.label}
          placeholder={bulk.placeholder}
          style={driftedColor ? { color: driftedColor } : undefined}
          className="min-w-[26px] max-w-[42px] flex-none border-0 bg-transparent text-center text-base font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          disabled={Number(draft) >= bulk.max}
          onClick={() => step(1)}
          aria-label={t("increaseCount")}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-white/10 bg-background text-foreground-secondary transition-colors hover:border-white/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          +
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={allMatch}
          className={cn(
            "h-9 whitespace-nowrap rounded-[10px] px-[14px] text-[12.5px] font-semibold transition-colors disabled:cursor-default",
            allMatch
              ? "border border-white/10 bg-transparent text-foreground-tertiary"
              : "border border-acc/45 bg-acc/[0.14] text-[#8cf3ff] hover:bg-acc/[0.22]",
          )}
        >
          {allMatch ? t("bulkApplied") : bulk.applyLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * The dashed "+ New round" trigger — its own full-width row at the BOTTOM of
 * the rounds list (mock), separate from {@link RoundsBulkBar} above.
 */
export function RoundsAddButton({
  addLabel,
  onAddRound,
}: {
  addLabel: string;
  onAddRound: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAddRound}
      className="flex h-12 w-full items-center justify-center gap-[9px] rounded-tile border border-dashed border-white/[0.16] text-[13.5px] font-semibold text-foreground-secondary transition-colors hover:border-white/30 hover:bg-white/[0.03] hover:text-foreground"
    >
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {addLabel}
    </button>
  );
}
