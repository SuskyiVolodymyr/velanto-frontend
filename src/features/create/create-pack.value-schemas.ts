import { z } from "zod";
import { PACK_FORMATS, SLOT_MODES } from "@/src/shared/types/pack";

/**
 * Field-limit constants and structural leaf/collection schemas for the
 * create-pack form. Split out of `create-pack.schema.ts` so the assembled
 * schema stays a thin composition.
 *
 * Numeric/length constants are the single source of truth for the form too and
 * equal the backend's:
 *   - title/description/tags caps: create-pack.dto.ts (100 / 500 / 10)
 *   - ITEM_TITLE_MAX: types/item.ts
 *   - ELIMINATION_MIN_DRAW / NXN_SIDE_COUNT_MIN|MAX: create-pack.dto.ts
 */
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const MAX_TAGS = 10;
export const ITEM_TITLE_MAX = 200;
// Elimination rounds must draw at least this many items to be a real choice.
export const ELIMINATION_MIN_DRAW = 2;
// nxn draws 1–6 per side; 1v1 is fixed at exactly 1.
export const NXN_SIDE_COUNT_MIN = 1;
export const NXN_SIDE_COUNT_MAX = 6;

const ITEM_TYPES = ["text", "youtube"] as const;

// Leaf/collection schemas are STRUCTURAL only (no min/business rules): all
// business validation lives in the per-format superRefine (see
// create-pack.refinements.ts), so the inactive collection's empty defaults
// don't fail before a format is chosen.
export const itemValueSchema = z.object({
  id: z.string(),
  type: z.enum(ITEM_TYPES),
  title: z.string(),
  value: z.string(),
});

// A group is a reusable POOL — no selectionMode/sampleSize (drawing is a
// per-round slot concern now).
export const groupValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(itemValueSchema),
});

export const slotValueSchema = z.object({
  groupId: z.string(),
  mode: z.enum(SLOT_MODES),
  count: z.number().optional(),
});

export const roundValueSchema = z.object({
  id: z.string(),
  slots: z.array(slotValueSchema),
});

export type PackDraft = {
  format: (typeof PACK_FORMATS)[number];
  groups: z.infer<typeof groupValueSchema>[];
  rounds: z.infer<typeof roundValueSchema>[];
};
