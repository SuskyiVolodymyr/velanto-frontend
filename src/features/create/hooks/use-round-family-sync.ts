import { useEffect } from "react";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import {
  newRound,
  versusRounds,
} from "@/features/create/create-pack.defaults";
import type { CreatePackValues } from "@/features/create/create-pack.schema";

// A fresh versus pack starts with ONE matchup; the per-round VersusEditor adds
// more (like RoundsEditor). Starting at 1 also keeps a single-item-pool draft
// feasible until the author shapes it. Per-side count starts at 1 for both nxn
// and 1v1.
const DEFAULT_VERSUS_ROUNDS = 1;

function isVersusFormat(format: CreatePackValues["format"]): boolean {
  return format === "nxn" || format === "1v1";
}

type RoundFamily = "versus" | "elimination";

// Which body a format uses. The two families have incompatible round shapes
// (2-slot versus, 1-slot elimination with a count/pins), so switching between
// them reshapes `rounds`.
export function familyOf(format: CreatePackValues["format"]): RoundFamily {
  if (isVersusFormat(format)) return "versus";
  return "elimination";
}

// The family the current rounds are already shaped for — read back so a switch
// WITHIN a family (e.g. save_one → rank_blind) leaves the author's rounds alone.
function roundsFamily(rounds: CreatePackValues["rounds"]): RoundFamily {
  if (rounds[0]?.slots.length === 2) return "versus";
  return "elimination";
}

/**
 * Reshape `rounds` when the format changes between the elimination family
 * (single-slot rounds) and the versus family (two-slot rounds). Keyed on
 * `format` and reading via getValues so it fires only on an actual switch,
 * never on every keystroke.
 */
export function useRoundFamilySync(
  format: CreatePackValues["format"],
  getValues: UseFormGetValues<CreatePackValues>,
  setValue: UseFormSetValue<CreatePackValues>,
): void {
  useEffect(() => {
    const groups = getValues("groups");
    const rounds = getValues("rounds");
    const firstId = groups[0]?.id ?? "";
    const target = familyOf(format);
    const current = roundsFamily(rounds);

    if (target === current) {
      // Same family — the only intra-family reshape is nxn → 1v1, which keeps
      // each round's own pair but re-pins every side's count to exactly 1.
      if (
        target === "versus" &&
        format === "1v1" &&
        rounds.some((round) =>
          round.slots.some((slot) => (slot.count ?? 1) !== 1),
        )
      ) {
        setValue(
          "rounds",
          rounds.map((round) => ({
            ...round,
            slots: round.slots.map((slot) => ({ ...slot, count: 1 })),
          })),
          { shouldDirty: true },
        );
      }
      return;
    }

    // Crossing families: reshape to a single default round of the target family
    // (the shapes are incompatible, so there's nothing to carry over).
    if (target === "versus") {
      const aId = groups[0]?.id ?? "";
      const bId = groups[1]?.id ?? groups[0]?.id ?? "";
      setValue("rounds", versusRounds(aId, bId, DEFAULT_VERSUS_ROUNDS, 1), {
        shouldDirty: true,
      });
    } else {
      setValue("rounds", [newRound(firstId)], { shouldDirty: true });
    }
  }, [format, getValues, setValue]);
}
