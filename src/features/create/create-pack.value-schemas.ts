import { z } from "zod";
import { PACK_FORMATS } from "@/src/shared/types/pack";

/**
 * Field-limit constants and structural leaf/collection schemas for the
 * create-pack form. Split out of `create-pack.schema.ts` so the assembled
 * schema stays a thin composition; behavior is unchanged.
 *
 * Numeric/length constants are the single source of truth for the form too
 * (imported by CreatePackForm via the schema barrel) and equal the backend's:
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
// in the per-format superRefine (see create-pack.refinements.ts). This keeps the
// inactive collection's default-but-empty entries from failing.
export const itemValueSchema = z.object({
  id: z.string(),
  type: z.enum(ITEM_TYPES),
  title: z.string(),
  value: z.string(),
});

export const groupValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  selectionMode: z.enum(["random", "manual"]),
  sampleSize: z.number().optional(),
  items: z.array(itemValueSchema),
});

export const categoryValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(itemValueSchema),
});

export type PackDraft = {
  format: (typeof PACK_FORMATS)[number];
  groups: z.infer<typeof groupValueSchema>[];
  categories: z.infer<typeof categoryValueSchema>[];
  versusRounds?: number;
  versusN?: number;
};
