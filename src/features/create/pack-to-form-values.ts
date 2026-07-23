import { PACK_FORMATS, type Pack } from "@/src/shared/types/pack";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";
import { DEFAULT_PACK_LANGUAGE } from "@/src/shared/types/pack-language";

/**
 * Project a fetched {@link Pack} onto the create-form's value shape so the same
 * form can seed an edit. Only the author-editable fields carry over; server-owned
 * fields (id, authorId, status, timestamps, vote/play stats) are intentionally
 * dropped — the edit submits a full content replacement, and the backend keeps
 * ownership/status under its own control.
 *
 * Every one of the six formats — save_one_friends included — has an editor body,
 * so this returns values for all of them. The null path is a defensive guard for
 * a genuinely unknown wire format (a backend deployed ahead of this build);
 * callers render an unsupported state rather than a broken form.
 */
export function packToFormValues(pack: Pack): CreatePackValues | null {
  // /packs/[id]/edit fetches ANY pack by id, and `format` arrives as a raw
  // string. Reject one this build doesn't know rather than seed a form with no
  // matching option and fail Save with no visibly failing control.
  if (!PACK_FORMATS.includes(pack.format)) return null;

  return {
    title: pack.title,
    description: pack.description,
    coverTone: pack.coverTone,
    // Seed the existing cover; null (gradient-only) maps to undefined so the
    // optional-string form field stays valid.
    coverImageKey: pack.coverImageKey ?? undefined,
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
