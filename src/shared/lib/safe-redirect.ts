// A `?next=` value comes straight from the URL, so it must be validated
// before being handed to router.push() — otherwise a crafted link
// (`/auth?next=https://evil.com` or `/auth?next=//evil.com`) could redirect
// a freshly-authenticated user off-site. Only a same-origin path starting
// with exactly one `/` is accepted; anything else falls back to home.
export function sanitizeNextPath(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
