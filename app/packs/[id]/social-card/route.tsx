import { ImageResponse } from "next/og";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { ogImageSourceFromKey } from "@/src/shared/lib/og-image-source";
import { packOgCard } from "@/src/shared/lib/og-card";
import { OG_CARD_SIZE } from "@/src/shared/lib/open-graph";

// Node runtime: the card fetches the cover from our CDN and base64-encodes it
// with Buffer (see ogImageSourceFromKey).
export const runtime = "nodejs";

// Keep very long titles from overflowing the card; the metadata title is the
// full one, this is only the rasterised art.
const TITLE_MAX = 90;

/**
 * Dynamic Open Graph card for a pack — its cover under a scrim with the title.
 * Named explicitly by the pack page's `openGraph.images` (via buildOpenGraph),
 * never inherited, so it can't hit the #233/#235 disinherit trap. Degrades to a
 * text-only branded card when the pack is missing or has no usable cover.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pack = await getPackServer(id).catch(() => null);
  const title = (pack?.title ?? "Velanto").slice(0, TITLE_MAX);
  const imageSrc = pack
    ? await ogImageSourceFromKey(pack.coverImageKey)
    : undefined;

  return new ImageResponse(packOgCard({ title, imageSrc }), {
    ...OG_CARD_SIZE,
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
