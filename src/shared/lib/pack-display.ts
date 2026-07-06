import type { Pack } from "@/src/shared/types/pack";

export const FORMAT_LABELS: Record<Pack["format"], string> = {
  save_one: "Save One",
  sacrifice_one: "Sacrifice One",
  nxn: "NxN",
};

export function getRoundsCount(pack: Pack): number {
  return pack.format === "nxn" ? (pack.versusRounds ?? 0) : (pack.groups?.length ?? 0);
}
