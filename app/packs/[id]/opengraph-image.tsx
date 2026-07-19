import { ImageResponse } from "next/og";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import {
  ogImageSourceFromKey,
  OG_COVER_FIT,
} from "@/src/shared/lib/og-image-source";
import { packOgCard } from "@/src/shared/lib/og-card";
import {
  OG_CARD_SIZE,
  OG_CARD_CONTENT_TYPE,
  OG_CARD_CACHE_CONTROL,
} from "@/src/shared/lib/open-graph";

// Node runtime: the card fetches the cover from our CDN and base64-encodes it
// with Buffer (see ogImageSourceFromKey). This is the METADATA FILE CONVENTION
// (not a route handler) on purpose: Vercel traces next/og's font + wasm into
// the serverless bundle for these files, which a plain route handler on the
// node runtime does NOT get — that mismatch 500'd the card in production while
// it worked in local dev/build. Next also appends a content hash to the
// inherited image URL, busting social-platform caches when the art changes.
export const runtime = "nodejs";
export const size = OG_CARD_SIZE;
export const contentType = OG_CARD_CONTENT_TYPE;
export const alt = "A Velanto pack";

// Keep very long titles from overflowing the card; the metadata title is the
// full one, this is only the rasterised art.
const TITLE_MAX = 90;

/**
 * Dynamic Open Graph + Twitter card for a pack — its cover under a scrim with
 * the title. Degrades to a text-only branded card when the pack is missing or
 * has no usable cover.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id).catch(() => null);
  const title = (pack?.title ?? "Velanto").slice(0, TITLE_MAX);
  // Fitted to the box the card actually paints. Handing Satori the full-size
  // source made a 56KB cover into a 794KB payload it had to decode on every
  // uncached request.
  const imageSrc = pack
    ? await ogImageSourceFromKey(pack.coverImageKey, OG_COVER_FIT)
    : undefined;

  return new ImageResponse(packOgCard({ title, imageSrc }), {
    ...size,
    headers: { "cache-control": OG_CARD_CACHE_CONTROL },
  });
}
