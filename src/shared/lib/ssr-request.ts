/**
 * Marks a fetch as coming from OUR SERVER rather than from a reader's browser.
 *
 * Server Components run on Vercel, so their fetches reach the API with a Vercel
 * address. The backend's visitor count treated each warm instance as a person —
 * one instance standing in for many readers, while those readers' own browsers
 * were counted separately when they called the API directly. The dashboard read
 * neither a headcount nor anything proportional to one
 * (velanto-backend#315).
 *
 * A hint, not a credential: the backend only uses it to leave the request out
 * of a statistic, and a reader who forged it would merely remove themselves
 * from a count. The durable per-account signal still runs either way.
 *
 * Add this to EVERY server-side fetch. A new `*-server.ts` that forgets it puts
 * the phantom visitors straight back.
 */
export const SSR_HEADERS = { "x-velanto-ssr": "1" } as const;
