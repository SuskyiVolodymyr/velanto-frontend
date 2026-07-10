const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface RuleItem {
  number: number;
  text: string;
}

export interface RuleCategory {
  id: string;
  title: string;
  rules: RuleItem[];
}

export interface RulesDocument {
  version: number;
  categories: RuleCategory[];
}

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
