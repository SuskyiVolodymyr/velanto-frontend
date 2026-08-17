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

/**
 * Cache policy for the DYNAMIC cards (a pack's cover, a profile's avatar).
 *
 * Without this the routes answer `max-age=0, must-revalidate` and every request
 * is a CDN MISS, so each unfurl cold-starts a lambda, fetches the pack from the
 * API, fetches the image from the CDN and re-rasterises the whole card. That's
 * ~1.5s when the platform is idle and 6-35s when it isn't — and crawlers give a
 * preview only a few seconds before falling back to the generic card, which is
 * why previews "randomly" lost their image under load. It also means every
 * unfurl is another request against the backend API.
 *
 * `max-age=0` keeps browsers revalidating (a visitor never sees a stale card),
 * while `s-maxage` lets the CDN serve one rendered image to every crawler.
 * `stale-while-revalidate` means the first request after expiry is still served
 * instantly from cache and the re-render happens behind it, so no crawler ever
 * waits for Satori.
 *
 * An hour is short relative to how long social platforms cache a scraped image
 * anyway (days), so it doesn't meaningfully delay a changed cover showing up.
 */
export const OG_CARD_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

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
