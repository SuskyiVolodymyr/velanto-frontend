import { ImageResponse } from "next/og";
import { getUserServer } from "@/src/features/author/get-user-server";
import { ogImageSourceFromKey } from "@/src/shared/lib/og-image-source";
import { profileOgCard } from "@/src/shared/lib/og-card";
import { OG_CARD_SIZE } from "@/src/shared/lib/open-graph";

// Node runtime: the card fetches the avatar from our CDN and base64-encodes it
// with Buffer (see ogImageSourceFromKey).
export const runtime = "nodejs";

const USERNAME_MAX = 40;

/**
 * Dynamic Open Graph card for a user profile — their avatar (or initial) above
 * their username. Named explicitly by the profile page's `openGraph.images`
 * (via buildOpenGraph), never inherited. Degrades to the initial placeholder
 * when the profile is missing or has no avatar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getUserServer(id).catch(() => null);
  const username = (profile?.username ?? "Velanto").slice(0, USERNAME_MAX);
  const imageSrc = profile
    ? await ogImageSourceFromKey(profile.avatarKey)
    : undefined;

  return new ImageResponse(profileOgCard({ username, imageSrc }), {
    ...OG_CARD_SIZE,
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
