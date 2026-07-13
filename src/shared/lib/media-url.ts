/**
 * Builds a public render URL for a stored media KEY (e.g.
 * "media/item/<uuid>.webp"). Pack `image` items store the S3 key as their item
 * value; this resolves it against `NEXT_PUBLIC_MEDIA_BASE_URL` — the
 * CloudFront/S3 public base, mirroring the backend's `S3_PUBLIC_BASE_URL`.
 *
 * Missing config degrades gracefully: with no base URL set we return a
 * root-relative path (a broken <img>, not a thrown error). An already-absolute
 * key (http/https) is returned untouched, and an empty key yields "".
 */
export function mediaUrl(key: string): string {
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return key;
  const path = key.replace(/^\/+/, "");
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
    /\/+$/,
    "",
  );
  return base ? `${base}/${path}` : `/${path}`;
}
