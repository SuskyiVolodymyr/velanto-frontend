import { z } from "zod";
import { PACK_FORMATS, PACK_TAGS } from "@/src/shared/types/pack";
import {
  DESCRIPTION_MAX,
  MAX_TAGS,
  TITLE_MAX,
  categoryValueSchema,
  groupValueSchema,
} from "@/src/features/create/create-pack.value-schemas";
import {
  validateGroups,
  validateHeadToHead,
  validateNxn,
} from "@/src/features/create/create-pack.refinements";

/**
 * Client-side validation for the create-pack form. Mirrors velanto-backend's
 * per-format rules (create-pack.dto.ts `.superRefine()` + types/item.ts
 * `groupSchema` + types/nxn.ts `categorySchema`) so the client rejects exactly
 * what the API rejects and accepts exactly what it accepts.
 *
 * This file is the thin assembler: field-limit constants and the structural
 * leaf/collection schemas live in `create-pack.value-schemas.ts`, and the three
 * per-format refinement validators live in `create-pack.refinements.ts`.
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
 */

// Re-export the field-limit constants so importers continue to resolve them from
// this module (the schema is their canonical barrel).
export {
  TITLE_MAX,
  DESCRIPTION_MAX,
  MAX_TAGS,
  ITEM_TITLE_MAX,
  CATEGORY_COUNT,
  MIN_VERSUS_ROUNDS,
  MAX_VERSUS_ROUNDS,
  MIN_VERSUS_N,
  MAX_VERSUS_N,
  HEAD_TO_HEAD_ROUND_SIZE,
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
    format: z.enum(PACK_FORMATS),
    tags: z
      .array(z.enum(PACK_TAGS))
      .max(MAX_TAGS, `Choose at most ${MAX_TAGS} tags.`),
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
