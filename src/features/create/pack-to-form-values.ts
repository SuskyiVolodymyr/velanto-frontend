import type { Pack } from "@/src/shared/types/pack";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

/**
 * Project a fetched {@link Pack} onto the create-form's value shape so the same
 * form can seed an edit. Only the author-editable fields carry over; server-owned
 * fields (id, authorId, status, timestamps, vote/play stats) are intentionally
 * dropped — the edit submits a full content replacement, and the backend keeps
 * ownership/status under its own control.
 */
export function packToFormValues(pack: Pack): CreatePackValues {
  return {
    title: pack.title,
    description: pack.description,
    coverTone: pack.coverTone,
    // Seed the existing cover; null (gradient-only) maps to undefined so the
    // optional-string form field stays valid.
    coverImageKey: pack.coverImageKey ?? undefined,
    format: pack.format,
    tags: pack.tags,
    groups: pack.groups,
    rounds: pack.rounds,
  };
}
