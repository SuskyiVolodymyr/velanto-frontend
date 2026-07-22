import { isUiPackFormat, type Pack } from "@/src/shared/types/pack";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";
import { DEFAULT_PACK_LANGUAGE } from "@/src/shared/types/pack-language";

/**
 * Project a fetched {@link Pack} onto the create-form's value shape so the same
 * form can seed an edit. Only the author-editable fields carry over; server-owned
 * fields (id, authorId, status, timestamps, vote/play stats) are intentionally
 * dropped — the edit submits a full content replacement, and the backend keeps
 * ownership/status under its own control.
 *
 * Returns null when the pack's format has no creator UI — see the format field
 * below. Callers must render an unsupported state rather than a broken form.
 */
export function packToFormValues(pack: Pack): CreatePackValues | null {
  // UI-EXCLUDED:save_one_friends (velanto-frontend#368)
  // A checked narrowing, not a cast. /packs/[id]/edit fetches ANY pack by id,
  // and a save_one_friends pack can already exist — packs are authored over the
  // API (velanto-pack-creator via the MCP), not only through this form. The old
  // `as UiPackFormat` cast succeeded silently: FormatSection then rendered with
  // no option selected and Save failed schema validation with no visibly
  // failing control. Bail out instead and let the caller say so.
  if (!isUiPackFormat(pack.format)) return null;

  return {
    title: pack.title,
    description: pack.description,
    coverTone: pack.coverTone,
    // Seed the existing cover; null (gradient-only) maps to undefined so the
    // optional-string form field stays valid.
    coverImageKey: pack.coverImageKey ?? undefined,
    // Narrowed by the guard above, so this needs no cast.
    format: pack.format,
    // Keep the pack's own content language on edit — never re-derive it from the
    // editor's interface locale, which would silently relabel a Spanish pack as
    // English just because a moderator or the author viewed it in English.
    language: pack.language ?? DEFAULT_PACK_LANGUAGE,
    tags: pack.tags,
    groups: pack.groups,
    rounds: pack.rounds,
  };
}
