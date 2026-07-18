import { mediaUrl } from "@/src/shared/lib/media-url";

/**
 * Resolve a stored media KEY to a base64 data URI for embedding in a social
 * card (see the `social-card` route handlers). We pre-fetch the bytes here
 * rather than handing Satori a URL to fetch itself, because a failed fetch
 * inside ImageResponse throws and 500s the whole card — pre-fetching lets a
 * missing/broken image degrade to the text-only card instead.
 *
 * Returns undefined (→ render without the image) when there's no key, when the
 * media base URL isn't configured so `mediaUrl` yields a non-absolute path
 * Satori couldn't load anyway, or when the fetch fails or is non-OK.
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
    const contentType = res.headers.get("content-type") ?? "image/webp";
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return undefined;
  }
}
