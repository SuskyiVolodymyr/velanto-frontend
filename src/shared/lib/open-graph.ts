import type { Metadata } from "next";

/**
 * Path to the site's file-based social card (`app/opengraph-image.tsx`).
 * Relative on purpose — Next resolves it against the `metadataBase` set in
 * `app/layout.tsx`, which is what turns it into an absolute production URL.
 */
export const OG_IMAGE_PATH = "/opengraph-image";

/**
 * The card's real dimensions, alt text and encoding. These live here rather
 * than in `app/opengraph-image.tsx` so this module can describe the image
 * without importing from `app/` (the folder rule in coding-conventions.md) and
 * without dragging `next/og`'s ImageResponse into every route's metadata
 * bundle. The card imports them back for its own required exports, so there is
 * one source of truth and the metadata cannot claim a size the card doesn't
 * render.
 */
export const OG_CARD_SIZE = { width: 1200, height: 630 } as const;
export const OG_CARD_ALT = "Velanto — create and play elimination quiz packs";
export const OG_CARD_CONTENT_TYPE = "image/png";

export interface BuildOpenGraphOptions {
  title: string;
  description: string;
  /** Absolute canonical URL of the page. */
  url: string;
  /** Defaults to "website"; profiles pass "profile". */
  type?: "website" | "profile";
  /**
   * Set for a route that CO-LOCATES its own dynamic card via the metadata file
   * convention (`opengraph-image.tsx` / `twitter-image.tsx`) — e.g. a pack's
   * cover+title or a user's avatar+name. When true we emit NO `images`, so Next
   * merges the co-located card (with its content hash) instead of us naming the
   * static site card, which would override it. Only set this on a route that
   * actually has a co-located file, or the page previews as a bare title card
   * (the #233/#235 disinherit failure).
   */
  deferImageToRoute?: boolean;
}

/**
 * Concrete rather than `NonNullable<Metadata["openGraph"]>`: that alias is a
 * wide union whose members disagree about `type`, so callers and tests can't
 * read the field back off it. The `satisfies` in the return keeps this honest
 * against Next's own type.
 */
export interface SiteOpenGraph {
  title: string;
  description: string;
  url: string;
  type: "website" | "profile";
  // Omitted when the route defers to a co-located opengraph-image file, so Next
  // supplies the (hashed) image itself. Present (length 1) otherwise.
  images?: {
    url: string;
    width: number;
    height: number;
    alt: string;
    type: string;
  }[];
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
 * keeps applying and the link still previews correctly on Twitter/X.
 *
 * The image is a full descriptor rather than a bare path string because Next
 * only emits `og:image:width`/`height`/`alt`/`type` for the descriptor form.
 * Facebook and LinkedIn use the declared dimensions to choose large-card vs
 * thumbnail on first scrape, so a naked `og:image` still previews worse than an
 * inherited one — the failure #235 is about, in a smaller size.
 *
 * Every route must route through here, and that is enforced: a
 * `no-restricted-syntax` rule in eslint.config.mjs makes an inline `openGraph`
 * object literal under `app/**` a lint error. The type system can't catch it —
 * an inline literal is still valid `Metadata` — which is exactly how the bug
 * reached production twice.
 *
 * Known gap: Next appends a content hash (`?<hash>`) to the *inherited* image
 * URL, which busts social-platform caches when the art changes. A statically
 * named path can't reproduce that hash. Routes that co-locate a dynamic card
 * (`deferImageToRoute`) DO get the hash, since Next names the image itself; the
 * static site-card path is the one exception without it.
 */
export function buildOpenGraph({
  title,
  description,
  url,
  type = "website",
  deferImageToRoute = false,
}: BuildOpenGraphOptions): SiteOpenGraph {
  // deferImageToRoute: the route co-locates its own opengraph-image file, so we
  // emit NO images and let Next merge the co-located (hashed) card. Every OTHER
  // route MUST carry the explicit site-card image, or it hits the #233/#235
  // disinherit failure — the image is present exactly when there's no route file.
  return {
    title,
    description,
    url,
    type,
    ...(deferImageToRoute
      ? {}
      : {
          images: [
            {
              url: OG_IMAGE_PATH,
              width: OG_CARD_SIZE.width,
              height: OG_CARD_SIZE.height,
              alt: OG_CARD_ALT,
              type: OG_CARD_CONTENT_TYPE,
            },
          ],
        }),
  } satisfies Metadata["openGraph"];
}
