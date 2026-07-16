import type { PatScope } from "@/src/shared/lib/tokens-client";

/**
 * Scope → i18n key fragment. Scope ids carry colons (`packs:read`), which can't
 * go in a translation key, so each maps to a camelCase fragment used by both the
 * `scopeLabel_*` and `scopeDesc_*` keys. Shared by the token manager (which
 * labels its checkboxes) and the API docs (which explain each scope).
 */
export const SCOPE_KEY: Record<PatScope, string> = {
  "packs:read": "packsRead",
  "packs:write": "packsWrite",
  "packs:delete": "packsDelete",
  moderation: "moderation",
  "profile:read": "profileRead",
};
