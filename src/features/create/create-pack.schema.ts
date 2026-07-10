import { z } from "zod";
import { PACK_FORMATS, PACK_TAGS } from "@/src/shared/types/pack";

/**
 * Client-side validation for the create-pack form. Mirrors velanto-backend's
 * per-format rules (create-pack.dto.ts `.superRefine()` + types/item.ts
 * `groupSchema` + types/nxn.ts `categorySchema`) so the client rejects exactly
 * what the API rejects and accepts exactly what it accepts.
 *
 * Two deliberate differences from the backend DTO, both wire-safe:
 *  1. `groups` and `categories` are BOTH always present in form state (the UI
 *     keeps a Groups editor and a Categories editor and swaps which is shown by
 *     `format`). The backend rejects a pack that *sends* the wrong collection
 *     for its format; the client never sends the inactive one (the submit step
 *     strips it), so we validate only the active collection per format instead
 *     of enforcing the backend's mutual-exclusion issues. Net wire effect is
 *     identical. This matches the old module-level `validate()` exactly.
 *  2. Strings are trimmed here (title/description), so the resolved values feed
 *     the create payload directly — the old form trimmed at submit time.
 *
 * Numeric/length constants are the single source of truth for the form too
 * (imported by CreatePackForm) and equal the backend's:
 *   - title/description/tags caps: create-pack.dto.ts (100 / 500 / 10)
 *   - CATEGORY_COUNT / MIN|MAX_VERSUS_ROUNDS / MIN|MAX_VERSUS_N: types/nxn.ts
 *   - HEAD_TO_HEAD_ROUND_SIZE: types/head-to-head.ts
 */
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const MAX_TAGS = 10;
export const CATEGORY_COUNT = 2;
export const MIN_VERSUS_ROUNDS = 1;
export const MAX_VERSUS_ROUNDS = 30;
export const MIN_VERSUS_N = 1;
export const MAX_VERSUS_N = 6;
export const HEAD_TO_HEAD_ROUND_SIZE = 2;

const ITEM_TYPES = ["text", "youtube"] as const;

// Leaf/collection schemas are STRUCTURAL only (no min/business rules): which
// collection is validated depends on `format`, so all business validation lives
// in the per-format superRefine below. This keeps the inactive collection's
// default-but-empty entries from failing.
const itemValueSchema = z.object({
  id: z.string(),
  type: z.enum(ITEM_TYPES),
  title: z.string(),
  value: z.string(),
});

const groupValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  selectionMode: z.enum(["random", "manual"]),
  sampleSize: z.number().optional(),
  items: z.array(itemValueSchema),
});

const categoryValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(itemValueSchema),
});

type PackDraft = {
  format: (typeof PACK_FORMATS)[number];
  groups: z.infer<typeof groupValueSchema>[];
  categories: z.infer<typeof categoryValueSchema>[];
  versusRounds?: number;
  versusN?: number;
};

// nxn: exactly CATEGORY_COUNT named, non-empty categories; versusRounds/versusN
// in range; each category must hold at least versusN items. Groups are ignored.
function validateNxn(pack: PackDraft, ctx: z.RefinementCtx) {
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

  if (pack.versusRounds === undefined || pack.versusRounds < MIN_VERSUS_ROUNDS) {
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
function validateHeadToHead(pack: PackDraft, ctx: z.RefinementCtx) {
  if (pack.groups.length === 0) {
    ctx.addIssue({ code: "custom", path: ["groups"], message: "Add at least one group." });
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

    const roundSize = group.selectionMode === "random" ? group.sampleSize : group.items.length;
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
function validateGroups(pack: PackDraft, ctx: z.RefinementCtx) {
  if (pack.groups.length === 0) {
    ctx.addIssue({ code: "custom", path: ["groups"], message: "Add at least one group." });
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

export const createPackSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give your pack a title.")
      .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer.`),
    description: z
      .string()
      .trim()
      .min(1, "Add a short description.")
      .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer.`),
    coverTone: z.string().min(1),
    format: z.enum(PACK_FORMATS),
    tags: z.array(z.enum(PACK_TAGS)).max(MAX_TAGS, `Choose at most ${MAX_TAGS} tags.`),
    groups: z.array(groupValueSchema),
    categories: z.array(categoryValueSchema),
    versusRounds: z.number().optional(),
    versusN: z.number().optional(),
  })
  .superRefine((pack, ctx) => {
    if (pack.format === "nxn") {
      validateNxn(pack, ctx);
      return;
    }
    if (pack.format === "1v1") {
      validateHeadToHead(pack, ctx);
      return;
    }
    validateGroups(pack, ctx);
  });

export type CreatePackValues = z.infer<typeof createPackSchema>;
