import type { Metadata } from "next";

/**
 * Path to the site's file-based social card (`app/opengraph-image.tsx`).
 * Relative on purpose — Next resolves it against `metadataBase`.
 */
export const OG_IMAGE_PATH = "/opengraph-image";

export interface BuildOpenGraphOptions {
  title: string;
  description: string;
  /** Absolute canonical URL of the page. */
  url: string;
  /** Defaults to "website"; profiles pass "profile". */
  type?: "website" | "profile";
}

/**
 * Concrete rather than `NonNullable<Metadata["openGraph"]>`: that alias is a
 * wide union whose members disagree about `type`, so callers and tests can't
 * read the field back off it. The `satisfies` below keeps this honest — if it
 * ever stops being a shape Next accepts, this file fails to compile.
 */
export interface SiteOpenGraph {
  title: string;
  description: string;
  url: string;
  type: "website" | "profile";
  images: string[];
}

/**
 * Builds a route's `openGraph` metadata with the site card attached.
 *
 * Use this instead of an inline object literal. Declaring `openGraph` in a
 * route's `generateMetadata()` stops Next inheriting the file-based
 * `app/opengraph-image.tsx`, so the image has to be named explicitly or the
 * page previews as a bare title card on every OG consumer — Facebook,
 * LinkedIn, Discord, Slack, iMessage, Telegram.
 *
 * That failure is quiet and asymmetric, which is why it shipped twice
 * (#233, #235): nothing declares a `twitter` block, so `app/twitter-image.tsx`
 * keeps applying and the link still previews correctly on Twitter/X. Routing
 * every caller through here means a new route can't reintroduce it by
 * forgetting a key.
 */
export function buildOpenGraph({
  title,
  description,
  url,
  type = "website",
}: BuildOpenGraphOptions): SiteOpenGraph {
  return {
    title,
    description,
    url,
    type,
    images: [OG_IMAGE_PATH],
  } satisfies Metadata["openGraph"];
}
