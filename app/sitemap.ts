import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://velanto.app";

/**
 * Minimal sitemap — only the root route exists at this stage (no product
 * pages yet, see issue #1). Extend this list as real routes land under
 * app/ so they stay indexable.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
