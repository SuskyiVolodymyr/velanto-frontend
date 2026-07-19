import { mediaUrl } from "@/src/shared/lib/media-url";

/**
 * Resolve a stored media KEY to a base64 PNG data URI for embedding in a social
 * card (see the `opengraph-image.tsx` / `twitter-image.tsx` routes). We pre-fetch
 * the bytes here rather than handing Satori a URL to fetch itself, because a
 * failed fetch inside ImageResponse throws and 500s the whole card — pre-fetching
 * lets a missing/broken image degrade to the text-only card instead.
 *
 * Crucially we also TRANSCODE to PNG. Our media is stored as WebP, and Satori
 * (next/og's rasteriser) cannot decode WebP — handed a `data:image/webp` src it
 * throws mid-render (`TypeError: u2 is not iterable`) and 500s the whole route,
 * which is uncatchable at the ImageResponse call site because it surfaces while
 * the response streams. That silently broke every pack/profile link preview
 * (velanto-frontend#... — Telegram/Discord/etc. showed title + description but no
 * image). sharp decodes WebP/AVIF/JPEG/PNG and re-encodes to PNG, a format Satori
 * handles, so the card always gets bytes it can rasterise.
 *
 * sharp is imported LAZILY, inside the try. It's a native module and its
 * top-level import failed to load inside the bundled OG serverless function on
 * Vercel — and a failed module import 500s the route before any try/catch can
 * run (the throw is at module-eval, not at the call). Deferring the import into
 * the guarded block means a sharp that can't load degrades to the text-only card
 * (undefined) instead of 500'ing the whole route.
 *
 * Returns undefined (→ render without the image) when there's no key, when the
 * media base URL isn't configured so `mediaUrl` yields a non-absolute path
 * Satori couldn't load anyway, when the fetch fails or is non-OK, when sharp
 * can't load, or when the bytes can't be decoded — every failure degrades to the
 * text-only card, never a 500.
 */
export async function ogImageSourceFromKey(
  key: string | null | undefined,
): Promise<string | undefined> {
  if (!key) return undefined;
  const url = mediaUrl(key);
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const input = Buffer.from(await res.arrayBuffer());
    const { default: sharp } = await import("sharp");
    const png = await sharp(input).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return undefined;
  }
}
