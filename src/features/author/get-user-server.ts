import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors HomeFeed/AuthorScreen: the backend caps `limit` at 50 and there's no
// pagination UI yet, so seed the first (and, for most authors, only) page.
const AUTHOR_PACKS_LIMIT = 50;

export interface AuthorPacksPage {
  items: Pack[];
  total: number;
}

/**
 * Server Component-only fetch of the PUBLIC user profile, mirroring
 * getPackServer's `cache: "no-store"` rationale. No credentials/token are
 * forwarded, so the backend returns the anonymous public view only (username,
 * bio, follower count; `isFollowedByMe` is null) — never ban-history or any
 * moderator-only data, which live behind separate authenticated endpoints.
 * Returns null on 404 so the caller can `notFound()`; throws on other errors so
 * the caller can fall back to the client-only path instead of showing a 404.
 */
export async function getUserServer(id: string): Promise<PublicUserProfile | null> {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load user: ${res.status}`);
  return (await res.json()) as PublicUserProfile;
}

/**
 * Server Component-only fetch of an author's first page of PUBLIC packs. The
 * anonymous `GET /packs?authorId=` view returns approved packs only — pending/
 * rejected packs are never exposed to an unauthenticated caller (see the
 * backend's PacksService.list isSelfAuthorView check), so this is safe to
 * server-render and seed.
 */
export async function getAuthorPacksServer(id: string): Promise<AuthorPacksPage> {
  const res = await fetch(
    `${API_BASE_URL}/packs?authorId=${encodeURIComponent(id)}&limit=${AUTHOR_PACKS_LIMIT}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Failed to load author packs: ${res.status}`);
  const data = (await res.json()) as { items: Pack[]; total: number };
  return { items: data.items, total: data.total };
}
