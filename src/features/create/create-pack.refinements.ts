import { z } from "zod";
import {
  CATEGORY_COUNT,
  HEAD_TO_HEAD_ROUND_SIZE,
  MAX_VERSUS_N,
  MAX_VERSUS_ROUNDS,
  MIN_VERSUS_N,
  MIN_VERSUS_ROUNDS,
  type PackDraft,
} from "@/src/features/create/create-pack.value-schemas";

// nxn: exactly CATEGORY_COUNT named, non-empty categories; versusRounds/versusN
// in range; each category must hold at least versusN items. Groups are ignored.
export function validateNxn(pack: PackDraft, ctx: z.RefinementCtx) {
  if (pack.categories.length !== CATEGORY_COUNT) {
    ctx.addIssue({
      code: "custom",
      path: ["categories"],
      message: `NxN packs need exactly ${CATEGORY_COUNT} categories.`,
    });
    return;
  }

  pack.categories.forEach((category, index) => {
    if (!category.name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["categories", index, "name"],
        message: "Every category needs a name.",
      });
    }
    if (category.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["categories", index, "items"],
        message: `Category "${category.name}" needs at least one item.`,
      });
    }
  });

  if (
    pack.versusRounds === undefined ||
    pack.versusRounds < MIN_VERSUS_ROUNDS
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["versusRounds"],
      message: "Set how many rounds to play.",
    });
  } else if (pack.versusRounds > MAX_VERSUS_ROUNDS) {
    ctx.addIssue({
      code: "custom",
      path: ["versusRounds"],
      message: `Rounds can't exceed ${MAX_VERSUS_ROUNDS}.`,
    });
  }

  if (pack.versusN === undefined || pack.versusN < MIN_VERSUS_N) {
    ctx.addIssue({
      code: "custom",
      path: ["versusN"],
      message: "Set how many items to show per side.",
    });
  } else if (pack.versusN > MAX_VERSUS_N) {
    ctx.addIssue({
      code: "custom",
      path: ["versusN"],
      message: `Items per round can't exceed ${MAX_VERSUS_N}.`,
    });
  } else {
    // versusN is present and in range: every category needs at least that many
    // items to sample per round.
    pack.categories.forEach((category, index) => {
      if (pack.versusN! > category.items.length) {
        ctx.addIssue({
          code: "custom",
          path: ["categories", index, "items"],
          message: `Category "${category.name}" needs at least ${pack.versusN} item(s).`,
        });
      }
    });
  }
}

// 1v1: at least one named group; each group's round size (sampleSize when
// random, else item count) must be exactly HEAD_TO_HEAD_ROUND_SIZE. Categories
// / versus fields are ignored.
export function validateHeadToHead(pack: PackDraft, ctx: z.RefinementCtx) {
  if (pack.groups.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["groups"],
      message: "Add at least one group.",
    });
    return;
  }

  pack.groups.forEach((group, index) => {
    if (!group.name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", index, "name"],
        message: "Every group needs a name.",
      });
    }

    const roundSize =
      group.selectionMode === "random" ? group.sampleSize : group.items.length;
    if (roundSize !== HEAD_TO_HEAD_ROUND_SIZE) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", index],
        message:
          group.selectionMode === "random"
            ? `Group "${group.name}" needs a sample size of exactly ${HEAD_TO_HEAD_ROUND_SIZE} for a 1v1 matchup.`
            : `Group "${group.name}" needs exactly ${HEAD_TO_HEAD_ROUND_SIZE} items for a 1v1 matchup.`,
      });
    } else if (
      group.selectionMode === "random" &&
      group.sampleSize !== undefined &&
      group.sampleSize > group.items.length
    ) {
      // Backend groupSchema parity: a random group's sampleSize may never
      // exceed its item count. The old validate() missed this for 1v1 (a
      // sampleSize of 2 passed the round-size check even with only 1 item),
      // so the client would let through a pack the API rejects. Closed here.
      ctx.addIssue({
        code: "custom",
        path: ["groups", index, "sampleSize"],
        message: `Group "${group.name}"'s sample size can't exceed its ${group.items.length} item(s).`,
      });
    }
  });
}

// save_one / sacrifice_one / rank_blind: at least one named group, each with at
// least one item; random groups need a sampleSize in [1, items.length].
export function validateGroups(pack: PackDraft, ctx: z.RefinementCtx) {
  if (pack.groups.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["groups"],
      message: "Add at least one group.",
    });
    return;
  }

  pack.groups.forEach((group, index) => {
    if (!group.name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", index, "name"],
        message: "Every group needs a name.",
      });
    }
    if (group.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["groups", index, "items"],
        message: `Group "${group.name}" needs at least one item.`,
      });
    }
    if (group.selectionMode === "random") {
      if (group.sampleSize === undefined || group.sampleSize < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["groups", index, "sampleSize"],
          message: `Group "${group.name}" needs a sample size.`,
        });
      } else if (group.sampleSize > group.items.length) {
        ctx.addIssue({
          code: "custom",
          path: ["groups", index, "sampleSize"],
          message: `Group "${group.name}"'s sample size can't exceed its ${group.items.length} item(s).`,
        });
      }
    }
  });
}
