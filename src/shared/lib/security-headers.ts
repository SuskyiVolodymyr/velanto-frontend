/**
 * HTTP security headers applied to every route (wired in next.config.ts's
 * `headers()`). These harden the rendered HTML the way @fastify/helmet hardens
 * the API.
 *
 * A full Content-Security-Policy is intentionally NOT here yet: a strict CSP in
 * Next.js needs per-request nonce plumbing (script/style nonces threaded through
 * the App Router) to avoid breaking inline styles/scripts, which is its own
 * focused change. Everything below is safe to apply globally without that work.
 */
export const securityHeaders: { key: string; value: string }[] = [
  {
    // Force HTTPS for two years, including subdomains. Browsers ignore this on
    // plain-HTTP (localhost dev), so it only bites in production over TLS.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    // Clickjacking protection — Velanto is never meant to be framed by another
    // site. SAMEORIGIN (not DENY) leaves room for any same-origin embedding.
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Stop the browser from MIME-sniffing a response into a different type.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Send the origin (not the full path/query) on cross-origin navigations.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Deny access to device APIs the app doesn't use (defense in depth).
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];
