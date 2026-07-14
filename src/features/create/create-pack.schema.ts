import { z } from "zod";
import { PACK_FORMATS, PACK_TAGS } from "@/src/shared/types/pack";
import {
  DESCRIPTION_MAX,
  MAX_TAGS,
  TITLE_MAX,
  groupValueSchema,
  roundValueSchema,
} from "@/src/features/create/create-pack.value-schemas";
import {
  validateElimination,
  validateVersus,
} from "@/src/features/create/create-pack.refinements";

/**
 * Client-side validation for the create-pack form. Mirrors velanto-backend's
 * per-format rules (create-pack.dto.ts `.superRefine()`) so the client rejects
 * exactly what the API rejects and accepts exactly what it accepts.
 *
 * Groups (pools) and rounds are BOTH always present in form state. Elimination
 * formats compose an ordered list of single-slot rounds; versus formats compose
 * two-slot rounds over the same two groups (the VersusEditor generates them).
 * Soft under-fill warnings are shown inline by RoundsEditor, not enforced here.
 */

export {
  TITLE_MAX,
  DESCRIPTION_MAX,
  MAX_TAGS,
  ITEM_TITLE_MAX,
  ELIMINATION_MIN_DRAW,
  ELIMINATION_MAX_DRAW,
  NXN_SIDE_COUNT_MIN,
  NXN_SIDE_COUNT_MAX,
} from "@/src/features/create/create-pack.value-schemas";

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
      .max(
        DESCRIPTION_MAX,
        `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
      ),
    coverTone: z.string().min(1),
    // Optional storage key of an uploaded cover image; absent keeps the tone.
    coverImageKey: z.string().optional(),
    format: z.enum(PACK_FORMATS),
    tags: z
      .array(z.enum(PACK_TAGS))
      .max(MAX_TAGS, `Choose at most ${MAX_TAGS} tags.`),
    groups: z.array(groupValueSchema),
    rounds: z.array(roundValueSchema),
  })
  .superRefine((pack, ctx) => {
    if (pack.format === "nxn" || pack.format === "1v1") {
      validateVersus(pack, ctx);
      return;
    }
    validateElimination(pack, ctx);
  });

export type CreatePackValues = z.infer<typeof createPackSchema>;
