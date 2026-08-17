import type { Pack, PackOverview } from "@/types/pack";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch, bypassing `apiClient`/`packsClient` on purpose:
 * `cache: "no-store"` guarantees fresh pack data, which Next.js's default
 * fetch caching in Server Components would not.
 */
export async function getPackServer(id: string): Promise<Pack | null> {
  const res = await fetch(`${API_BASE_URL}/packs/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load pack: ${res.status}`);
  return (await res.json()) as Pack;
}

/**
 * The same pack without its content — for the public pack page and its OG
 * image, the only two surfaces that draw a pack but never its items.
 *
 * Use {@link getPackServer} for anything that plays, edits or reviews a pack.
 */
export async function getPackOverviewServer(
  id: string,
): Promise<PackOverview | null> {
  const res = await fetch(`${API_BASE_URL}/packs/${id}/overview`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load pack: ${res.status}`);
  return (await res.json()) as PackOverview;
}
