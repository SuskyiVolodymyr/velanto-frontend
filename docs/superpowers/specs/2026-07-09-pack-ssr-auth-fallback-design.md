# Pack SSR Auth Fallback — Design

> Fixes velanto-frontend#66: server-side pack fetches never forward the viewer's auth, so a pack's own owner or a moderator gets a 404 viewing a pending/rejected pack via direct URL/SSR, even though the identical request with an `Authorization: Bearer` header would succeed.

## Problem

`getPackServer()`/`getResultsServer()` (`src/shared/lib/get-pack-server.ts`, `get-results-server.ts`) run in Next.js Server Components and fetch anonymously — no auth attached. The backend's visibility gate 404s any non-approved pack unless the viewer is its owner or moderator+. Since the Server Component never has a viewer identity, it always hits that gate for non-approved packs, regardless of who's actually logged in in the browser.

Two structural reasons a Server Component can't just "attach the token" the way client code does:

- The access token lives only in an in-memory JS variable inside `api-client.ts` (deliberately never `localStorage`/a client-readable store, per `security-checklist.md`), which the Next.js server process running Server Components has no access to.
- The refresh-token httpOnly cookie is scoped to the *backend's* origin (`localhost:3001`, path `/auth`) — a different origin than the Next.js frontend server, so it's never present on the incoming request to a Server Component either, and in production frontend/backend will likely be genuinely different domains.

The pack detail endpoint's companion, `GET /packs/:id/results`, runs the identical gate before returning results, so `getResultsServer` has the same problem in practice — though see "Why `getResultsServer` needs no code change" below.

Both symptoms named in the original issue — the moderation queue's "View" link and Profile → "My Packs" pending/rejected pack link — route through these same three pages (confirmed: `ModerationQueueScreen.tsx` and `PackCard.tsx` both link to `/packs/${id}`), so fixing these three routes covers both.

## Chosen strategy: client-side retry fallback

Two strategies were considered: (1) this client-side fallback, small blast radius, no auth-architecture change; (2) migrating the whole access-token model to a frontend-owned httpOnly cookie via new Route Handlers, so Server Components could read it directly — more "textbook" security posture, but touches the whole auth model for what's currently a 2-page bug. **Strategy 1 is chosen.**

Each of the three routes (`/packs/[id]`, `/packs/[id]/play`, `/packs/[id]/result`) keeps its existing anonymous SSR fast path unchanged — when it succeeds (the common case: public, approved packs), zero extra client JS is added, and SEO/performance stay exactly as they are today. Only when the anonymous fetch returns `null` does the page hand off to a Client Component that retries as the authenticated viewer (using the token already living in browser memory) before conceding the pack truly isn't visible.

## Architecture

### Why not a render-prop gate (rejected)

An earlier draft of this design proposed one reusable gate component taking a `children(pack, results)` render-prop. This is **not implementable**: the three `page.tsx` files are async Server Components, and passing a function from a Server Component to a Client Component is a hard Next.js error ("Functions cannot be passed directly to Client Components"). It also wasn't idiomatic for this codebase — `ModerationQueueScreen`, `ProfileScreen`, `AuthorScreen`, and the play screens all already use the same convention for auth-gated fetch-and-render: a `useState` status machine gated on `useAuth().status`, with `return null` while loading. The design below follows that convention instead.

### New shared hook — `src/shared/hooks/use-pack-fallback.ts`

```ts
type PackFallbackState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; pack: Pack; results: PackResults | RankResults | null };

function usePackFallback(packId: string, opts: { needsResults: boolean }): PackFallbackState
```

Behavior:
- `useAuth().status === "loading"` → `{ status: "loading" }`. No fetch attempted yet — never 404s a valid owner mid-refresh.
- `"unauthenticated"` → `{ status: "notfound" }`. Matches today's behavior for anonymous viewers exactly: no new information disclosure, no wasted network round trip.
- `"authenticated"` → effect fetches `packsClient.getById(packId)` (already sends the in-memory Bearer token); on success, if `opts.needsResults`, sequentially fetches `playsClient.getResults(packId)` (new client method, see below). Success → `{ status: "ready", pack, results }`. Any rejection at either step → `{ status: "notfound" }`.
- Fetches pack then results **sequentially**, not in parallel — mirrors the server-side ordering and avoids firing a results request when the pack itself is already gone.
- Standard `cancelled`-guard-on-unmount, matching this repo's existing effect convention.

### Three thin Client wrapper components

- `src/features/pack/PackDetailFallback.tsx`
- `src/features/play/PlayFallback.tsx`
- `src/features/result/ResultFallback.tsx`

Each is a small `"use client"` component: call `usePackFallback`, and

- `status === "notfound"` → call `notFound()` **synchronously during render** (not inside the fetch's `.catch()` — `notFound()` throws a sentinel that only the App Router's render-phase error handling catches; thrown from an effect/promise callback it becomes an unhandled rejection and never shows the 404 UI). The hook only ever sets state to `"notfound"`; the wrapper's render body is what actually calls `notFound()`.
- `status !== "ready"` (i.e. `"loading"`) → `return null`, matching this repo's universal loading convention (`PlayScreen`, `ProfileScreen`, etc. all do this — no spinner).
- `status === "ready"` → render the real screen: `PackDetailScreen`, `PlayRouter`, or `ResultScreen` respectively.

### Two extractions so the fast path and fallback share one source of truth

- **`src/features/pack/PackDetailScreen.tsx`** (new) — the pack-detail JSX currently inlined in `app/packs/[id]/page.tsx` (cover banner, vote buttons, description, tags, Play link, Stats, the groups-vs-categories list for `nxn`, comments) extracted into its own component, `{ pack, results }` props, mirroring the existing `ResultScreen` pattern. Not a client component — purely presentational, composing existing client children (`VoteButtons`, `CommentSection`) — so it renders identically whether reached via the SSR fast path or the client fallback.
- **`src/features/play/PlayRouter.tsx`** (new) — the 3-way format branch already in `play/page.tsx` (`rank_blind` → `RankPlayScreen`, `1v1` → `HeadToHeadPlayScreen`, else → `PlayScreen`) extracted so both the play fast-path and `PlayFallback` share the identical mapping instead of duplicating it.

### New client method — `src/shared/lib/plays-client.ts`

```ts
getResults: (packId: string) => apiClient.get<PackResults | RankResults>(`/packs/${packId}/results`)
```

Mirrors `get-results-server.ts`'s request shape, but goes through `apiClient`, which attaches the in-memory Bearer token.

### Why `getResultsServer` needs no code change

`GET /packs/:id/results` uses the identical visibility gate as pack detail, and both server-side fetches happen anonymously within the same request — so they're always consistent: if the anonymous pack fetch 404s, the anonymous results fetch would too, and today's code (and the updated code) never even reaches it in that case. No change needed to `get-results-server.ts` itself.

### Per-page control flow

```ts
// app/packs/[id]/page.tsx
const pack = await getPackServer(id);
if (!pack) return <PackDetailFallback packId={id} />;
const results = await getResultsServer(id);
return <PackDetailScreen pack={pack} results={results} />;

// app/packs/[id]/play/page.tsx
const pack = await getPackServer(id);
if (!pack) return <PlayFallback packId={id} />;
return <PlayRouter pack={pack} />;

// app/packs/[id]/result/page.tsx
const pack = await getPackServer(id);
if (!pack) return <ResultFallback packId={id} />;
const results = await getResultsServer(id);
return <ResultScreen pack={pack} results={results} />;
```

The existing `if (!pack) notFound()` calls in these three Server Components are removed — the null branch now delegates to the fallback instead of immediately 404ing.

### SEO/robots mitigation for `generateMetadata`

Client-fallback means the server now returns a 200 shell (which client-renders into either the real content or, eventually, a 404) instead of an immediate hard 404 whenever the anonymous fetch returns null — including for **genuinely deleted** packs, not only pending/rejected ones a real owner might resolve. Since `generateMetadata` runs server-side only (no client auth visibility), it can't tell these apart either. Fix: when `getPackServer` returns null, `generateMetadata` sets `robots: { index: false, follow: false }` alongside the existing "Pack not found" title. Crawlers are always anonymous, so for them the null branch *is* genuinely not-found; noindex keeps the soft-404 shell out of search results without affecting a real logged-in owner/moderator, who never looks at `<meta name="robots">`.

## Testing plan

Mocking conventions follow this repo's existing precedent (e.g. `VoteButtons.test.tsx`): `vi.mock("@/src/shared/lib/auth-context")` + `vi.mocked(useAuth).mockReturnValue(...)` to drive `loading`/`authenticated`/`unauthenticated` deterministically; `vi.mock("next/navigation", () => ({ notFound: vi.fn(), ... }))` and assert it was called; mocked `packsClient`/`playsClient` with `mockResolvedValue`/`mockRejectedValue(new ApiError(404, ...))`.

- **`src/shared/hooks/use-pack-fallback.test.tsx`** (core logic — most cases live here): auth-loading → `loading`, no fetch attempted; unauthenticated → `notfound`, no fetch attempted; authenticated + `getById` resolves (and `getResults` resolves when `needsResults`) → `ready` with pack+results; `getById` rejects with a 404 `ApiError` → `notfound`; adversarial: `getById` resolves but `getResults` rejects → `notfound`; `needsResults: false` never calls `getResults`; cancelled-guard: unmounting before the fetch resolves never calls `setState`.
- **`src/features/pack/PackDetailScreen.test.tsx`** (new coverage for the previously-untested inlined JSX): renders title/description/stats/Play link; renders the `groups` list for `save_one`; adversarial: renders the `categories` list (not `groups`) for `nxn`.
- **`src/features/pack/PackDetailFallback.test.tsx`**: authenticated + success → screen content visible, `notFound` not called; unauthenticated → `notFound` called; authenticated + `getById` 404 → `notFound` called.
- **`src/features/play/PlayRouter.test.tsx`**: `rank_blind` → `RankPlayScreen`, `1v1` → `HeadToHeadPlayScreen`, `save_one` (or any other format) → `PlayScreen`, asserted via a distinctive element from each.
- **`src/features/play/PlayFallback.test.tsx`**, **`src/features/result/ResultFallback.test.tsx`**: one success-render case + one 404→`notFound` case + one unauthenticated→`notFound` case each — kept light since the hook already covers the fetch logic exhaustively.
- **No new e2e spec.** `getPackServer`/`getResultsServer` fetch runs in the Next.js Server Component (Node process), which Playwright's `page.route()` cannot intercept — it only sees browser-issued requests (confirmed by `create-pack.spec.ts`'s own comment noting the identical limitation for `/packs/[id]`). The Playwright config also doesn't run a live backend alongside `next dev`. Per `testing-requirements.md`, e2e is gated on PRs into `main` only, not `develop`, so this isn't a gap against this repo's actual bar. The real end-to-end regression check is manual: verify against the live backend (both dev servers running) that an owner/moderator can view a pending/rejected pack via direct URL, and that an anonymous/unrelated viewer still gets a genuine 404.

## Out of scope

- The full httpOnly-cookie/BFF auth migration (rejected strategy above) — no changes to `api-client.ts`'s token storage model, no new Route Handlers, no backend changes.
- Rendering a "rejected" banner/reason on `PackDetailScreen` — `pack.rejectionReason` isn't surfaced there today; unrelated to this fix.
- Any change to the backend's visibility gate itself — it already behaves correctly; the bug is purely in how the frontend forwards (or fails to forward) a viewer identity to it.
