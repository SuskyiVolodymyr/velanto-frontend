import type { RulesDocument } from "@/src/shared/types/rules";

// Canonical rules types now live in `@/src/shared/types/rules` (resolves the
// #91 review Minor about them being defined inline here). Re-exported so the
// existing `import ... from "./get-rules-server"` call sites keep working.
export type {
  RuleItem,
  RuleCategory,
  RulesDocument,
} from "@/src/shared/types/rules";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch of the public Community Rules, bypassing
 * `apiClient` on purpose. Unlike {@link getPackServer}'s `cache: "no-store"`,
 * rules are near-static content: we revalidate on an interval so the page is
 * served from Next's cache and the backend isn't hit on every request. A stale
 * copy for up to an hour is acceptable for legal/community text.
 */
export async function getRulesServer(): Promise<RulesDocument> {
  const res = await fetch(`${API_BASE_URL}/rules`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Failed to load rules: ${res.status}`);
  return (await res.json()) as RulesDocument;
}
