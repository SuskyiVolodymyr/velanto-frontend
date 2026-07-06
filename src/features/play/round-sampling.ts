import type { Category, Group, Item } from "@/src/shared/types/pack";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Resolves which items a round shows to the player: all items in authored
 * order for `manual`, or a fresh random sample of `sampleSize` for `random`
 * (re-sampled every play, per domain-rules.md).
 */
export function resolveRoundCandidates(group: Group): Item[] {
  if (group.selectionMode === "manual") return group.items;
  const size = group.sampleSize ?? group.items.length;
  return shuffle(group.items).slice(0, size);
}

/**
 * Resolves which items an nxn round shows for one side: a fresh random
 * sample of `versusN` items, re-sampled every round (categories are flat
 * pools, not pre-split — there's no manual mode for nxn).
 */
export function resolveVersusRoundCandidates(category: Category, versusN: number): Item[] {
  return shuffle(category.items).slice(0, versusN);
}
