/**
 * One colour family per anonymous label.
 *
 * Shared rather than owned by the results table, because a label's colour is
 * only useful if it is the SAME colour everywhere it appears: the whole mode is
 * following one label's trajectory across rounds, and a label that is teal on
 * the round card and amber in the history table cannot be followed at all.
 *
 * Four families; beyond that they cycle, which is fine — the letters, not the
 * colours, are what identify a label.
 */
export const LABEL_TONES = [
  { chip: "bg-acc/[0.14] text-acc-hover", cell: "bg-acc/[0.07]" },
  { chip: "bg-hot/[0.14] text-hot", cell: "bg-hot/[0.07]" },
  { chip: "bg-live/[0.14] text-live", cell: "bg-live/[0.07]" },
  { chip: "bg-score/[0.14] text-score", cell: "bg-score/[0.07]" },
];

/**
 * The tone for one label, from its position in the game's SORTED label set —
 * not from where it happens to sit in the round being rendered. A label that
 * skipped a round would otherwise shift every colour after it.
 */
export function labelTone(
  allLabels: readonly string[],
  label: string,
): (typeof LABEL_TONES)[number] {
  const index = allLabels.indexOf(label);
  return LABEL_TONES[(index < 0 ? 0 : index) % LABEL_TONES.length];
}
