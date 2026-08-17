/**
 * Builds a public render URL for a stored media KEY (e.g.
 * "media/item/<uuid>.webp"). Pack `image` items store the S3 key as their item
 * value; this resolves it against `NEXT_PUBLIC_MEDIA_BASE_URL` — the
 * CloudFront/S3 public base, mirroring the backend's `S3_PUBLIC_BASE_URL`.
 *
 * Missing config degrades gracefully: with no base URL set we return a
 * root-relative path (a broken <img>, not a thrown error), and an empty key
 * yields "".
 *
 * An absolute http(s) key yields "" — it is REFUSED, not passed through
 * (velanto-backend#169). Every image on Velanto is one we issued and serve
 * ourselves, so an absolute key is never legitimate; it means someone got a
 * remote URL into an item's value. This function is the last step before
 * <img src>, so it declines regardless of what it is handed: a broken image
 * beats fetching from a host we don't control, which would leak every viewer's
 * IP to a pack author's server and let approved content be swapped after
 * moderation. The API rejects these at write time too — this is the second lock.
 */
export function mediaUrl(key: string): string {
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return "";
  const path = key.replace(/^\/+/, "");
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
    /\/+$/,
    "",
  );
  return base ? `${base}/${path}` : `/${path}`;
}
