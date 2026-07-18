import type { MetadataRoute } from "next";
import type { Pack } from "@/src/shared/types/pack";
import { SITE_URL } from "@/src/shared/lib/site-url";
import { LEGAL_LAST_UPDATED } from "@/src/features/legal/legal-meta";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// The backend caps `limit` at 50 and there's no sitemap-index/pagination here
// yet — request one page of the most relevant approved packs. If the catalog
// outgrows this, a paginated sitemap index is the follow-up.
const PACK_CAP = 50;

// Public, indexable app routes that always exist regardless of API state.
const STATIC_PATHS = ["/", "/docs", "/feedback", "/updates"] as const;

// Same, but they change about once a year rather than weekly, so they carry a
// lower priority and changeFrequency than the paths above.
const LEGAL_PATHS = ["/terms", "/privacy"] as const;

/**
 * Fetches the anonymous public pack list (approved packs only — the
 * unauthenticated `GET /packs` view never exposes pending/rejected packs).
 * Returns [] on any failure so an unreachable API at build/request time
 * degrades the sitemap to its static routes instead of erroring the build.
 */
async function fetchApprovedPacks(): Promise<Pack[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/packs?limit=${PACK_CAP}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: Pack[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));

  // `lastModified` is the real edit date of the documents, not `now` — these
  // change about once a year, and claiming otherwise teaches crawlers to
  // ignore the field.
  const legalRoutes: MetadataRoute.Sitemap = LEGAL_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(LEGAL_LAST_UPDATED),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const packs = await fetchApprovedPacks();

  const packRoutes: MetadataRoute.Sitemap = packs.map((pack) => ({
    url: `${SITE_URL}/packs/${pack.id}`,
    lastModified: pack.createdAt ? new Date(pack.createdAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // No public users-list endpoint exists — derive indexable profile URLs from
  // the (public) authors of the approved packs above, de-duplicated.
  const authorIds = [
    ...new Set(packs.map((pack) => pack.authorId).filter(Boolean)),
  ];
  const userRoutes: MetadataRoute.Sitemap = authorIds.map((authorId) => ({
    url: `${SITE_URL}/users/${authorId}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...legalRoutes, ...packRoutes, ...userRoutes];
}
