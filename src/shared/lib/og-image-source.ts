import { mediaUrl } from "@/src/shared/lib/media-url";

/** The card background (`BG` in og-card.tsx), as channels sharp can flatten to. */
export const OG_CARD_BACKGROUND_RGB = { r: 10, g: 11, b: 14 } as const;

/** The box a pack cover is painted into — the full card, full bleed. */
export const OG_COVER_FIT = { width: 1200, height: 630 } as const;

/** The box a profile avatar is painted into — the 224px circle, not the card. */
export const OG_AVATAR_FIT = { width: 224, height: 224 } as const;

export interface OgImageFit {
  width: number;
  height: number;
}

/**
 * Resolve a stored media KEY to a base64 JPEG data URI for embedding in a social
 * card (see the `opengraph-image.tsx` / `twitter-image.tsx` routes). We pre-fetch
 * the bytes here rather than handing Satori a URL to fetch itself, because a
 * failed fetch inside ImageResponse throws and 500s the whole card — pre-fetching
 * lets a missing/broken image degrade to the text-only card instead.
 *
 * Crucially we also TRANSCODE. Our media is stored as WebP, and Satori (next/og's
 * rasteriser) cannot decode WebP — handed a `data:image/webp` src it throws
 * mid-render (`TypeError: u2 is not iterable`) and 500s the whole route, which is
 * uncatchable at the ImageResponse call site because it surfaces while the
 * response streams. sharp decodes WebP/AVIF/JPEG/PNG and re-encodes to a format
 * Satori handles, so the card always gets bytes it can rasterise.
 *
 * We encode JPEG at the painted size, NOT a full-size lossless PNG. The PNG
 * version made every preview so slow that crawlers gave up and fell back to the
 * generic card: a 56KB 736x552 cover re-encoded to a 794KB PNG (14x the source),
 * which is 1056KB once base64'd, all of which Satori had to decode and rasterise
 * on each uncached request. The same cover as a fitted JPEG is ~105KB. Satori
 * decodes JPEG fine — verified by rendering one through ImageResponse, not
 * assumed, because guessing at its decoder cost three bad deploys before.
 *
 * `fit` is required per caller rather than hardcoded: a cover fills the whole
 * 1200x630 card, but an avatar is painted into a 224px circle, and sharing one
 * size would crop every avatar to the cover's aspect ratio. We never enlarge —
 * upscaling a small avatar only costs bytes.
 *
 * Transparency is flattened onto the card's own background because JPEG has no
 * alpha; a transparent avatar then reads as sitting directly on the card instead
 * of inside the black box a naive JPEG conversion would leave.
 *
 * 🔒 sharp is imported LAZILY, inside the try, and MUST stay that way. It's a
 * native module and its top-level import failed to load inside the bundled OG
 * serverless function on Vercel — and a failed module import 500s the route
 * before any try/catch can run (the throw is at module-eval, not at the call).
 * Deferring the import into the guarded block means a sharp that can't load
 * degrades to the text-only card (undefined) instead of 500'ing the whole route.
 *
 * This pairs with the `serverExternalPackages` + route tracing in
 * next.config.ts — don't remove one without the other. Both landed as
 * production hotfixes straight to main, so a branch cut before them will look
 * "cleaner" with a static import and will reintroduce the 500. This rewrite hit
 * exactly that: the develop→main merge conflicted here, which is the only
 * reason it was caught before deploying.
 *
 * Returns undefined (→ render without the image) when there's no key, when the
 * media base URL isn't configured so `mediaUrl` yields a non-absolute path
 * Satori couldn't load anyway, when the fetch fails or is non-OK, when sharp
 * can't load, or when the bytes can't be decoded — every failure degrades to the
 * text-only card, never a 500.
 */
export async function ogImageSourceFromKey(
  key: string | null | undefined,
  fit: OgImageFit = OG_COVER_FIT,
): Promise<string | undefined> {
  if (!key) return undefined;
  const url = mediaUrl(key);
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const input = Buffer.from(await res.arrayBuffer());
    // Lazy import from the production hotfix, kept: a top-level `import sharp`
    // throws at module-eval inside the bundled OG lambda, before this try/catch
    // can run, and 500s the route.
    const { default: sharp } = await import("sharp");
    const jpeg = await sharp(input)
      .resize(fit.width, fit.height, {
        fit: "cover",
        withoutEnlargement: true,
      })
      .flatten({ background: OG_CARD_BACKGROUND_RGB })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}
