import { ImageResponse } from "next/og";
import { getUserServer } from "@/src/features/author/get-user-server";
import {
  ogImageSourceFromKey,
  OG_AVATAR_FIT,
} from "@/src/shared/lib/og-image-source";
import { profileOgCard } from "@/src/shared/lib/og-card";
import {
  OG_CARD_SIZE,
  OG_CARD_CONTENT_TYPE,
  OG_CARD_CACHE_CONTROL,
} from "@/src/shared/lib/open-graph";

// Node runtime + metadata FILE CONVENTION (see the pack card for why): a plain
// route handler on node doesn't get next/og's font/wasm traced into the Vercel
// serverless bundle and 500s in production.
export const runtime = "nodejs";
export const size = OG_CARD_SIZE;
export const contentType = OG_CARD_CONTENT_TYPE;
export const alt = "A Velanto profile";

const USERNAME_MAX = 40;

/**
 * Dynamic Open Graph + Twitter card for a user profile — their avatar (or
 * initial) above their username. Degrades to the initial placeholder when the
 * profile is missing or has no avatar.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getUserServer(id).catch(() => null);
  const username = (profile?.username ?? "Velanto").slice(0, USERNAME_MAX);
  // The avatar is painted into a 224px circle, not the 1200x630 card — fitting
  // it to the cover's box instead would crop every profile to a wide strip.
  const imageSrc = profile
    ? await ogImageSourceFromKey(profile.avatarKey, OG_AVATAR_FIT)
    : undefined;

  return new ImageResponse(profileOgCard({ username, imageSrc }), {
    ...size,
    headers: { "cache-control": OG_CARD_CACHE_CONTROL },
  });
}
