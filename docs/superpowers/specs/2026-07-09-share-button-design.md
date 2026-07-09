# Share Button — Design

> Implements velanto-frontend#67: a "Share" / "Share result" copy-link popover on the Pack and Result screens. The Result-screen variant embeds the sharer's own picks in the link so an opener sees the *sharer's* result, not their own.

## Problem

The pack detail and result screens have no way to share a link. For the result screen specifically, "your pick" per round is read from the viewer's own `sessionStorage` (`readLastPlayPicks`), which is local to their browser — so a naively-shared `/packs/:id/result` link shows the *opener's* picks (or none), never the sharer's. To make "share my result" meaningful, the sharer's picks must travel with the link.

## Chosen strategy: encode picks in the URL (frontend-only)

Two strategies were considered: (A) encode the sharer's picks into the share URL, decoded client-side by the opener's result screen; (B) a backend shareable play-record endpoint (`?play=<id>`). **Strategy A is chosen** — it keeps #67 a self-contained frontend change, needs no backend, and works for logged-out openers. If share URLs ever become unwieldy we can migrate to B later without changing the UX.

The community aggregate (per-round %s, average positions) is always fetched live from the backend the same way for everyone; only the *picks overlay* differs between "your result" and "a shared result". So the only thing that must be encoded is the sharer's `RecordedPick[]`.

## Architecture

### New util — `src/shared/lib/share-url.ts`

```ts
encodePicks(picks: RecordedPick[]): string          // base64url(JSON.stringify(picks))
decodePicks(code: string): RecordedPick[] | null    // reverse; returns null on any malformed input
buildShareUrl(path: string, picks?: RecordedPick[] | null): string
  // `${window.location.origin}${path}` + (picks?.length ? `?p=${encodePicks(picks)}` : "")
```

- **Encoding choice — base64url-of-JSON, not a compact index scheme.** It is format-agnostic: it round-trips the full `RecordedPick` shape including `rank_blind`'s multiple-picks-per-group with a `position` field, with no coupling to result ordering, and decodes without needing the pack/results loaded. Tradeoff: longer URLs than an index scheme. For realistic packs (a handful of rounds) the encoded string is a few hundred characters — well within URL limits. A pathological `rank_blind` pack (many groups × many slots) could in principle produce a large URL; this is acceptable for now (YAGNI — revisit with strategy B if it ever bites).
- `decodePicks` is **fully defensive**: it is opener-facing and fed an arbitrary URL param. It must never throw. On base64 error, JSON error, or a shape that is not an array of `{ groupId: string; itemId: string; position?: number }`, it returns `null`, and the caller falls back to own-picks / aggregate. This is the security-checklist "never trust client input" rule applied to a query param.
- `base64url` (not standard base64) so the code is URL-safe without percent-encoding. Decode tolerates missing padding.

### New component — `src/features/share/ShareButton.tsx`

`"use client"`. Props: `{ path: string; picks?: RecordedPick[] | null; label?: string }` (default label `"Share"`).

- Renders a `Button` (variant `secondary`) with the label. On click, toggles an anchored popover `<div>` (absolute-positioned relative to a wrapping `relative` container) — **reusing the `UserMenu` popover pattern**, not the full-screen `Modal`: outside-`mousedown` closes it, `Escape` closes and returns focus to the trigger, `containerRef`/`triggerRef` refs.
- Popover contents: a read-only `<input>` pre-filled with `buildShareUrl(path, picks)`, its text auto-selected on open (`onFocus` select + focus the input when the popover opens), and a Copy `Button` beside it.
- The URL is built lazily when the popover opens (`buildShareUrl` reads `window.location.origin`, which only exists client-side; building on open guarantees `window` is defined and avoids any SSR/hydration mismatch — the input only ever renders after a user click).
- Copy: `await navigator.clipboard.writeText(url)`; on success swap the Copy button's label to `"Copied!"` for 1600ms, then revert (timeout cleared on unmount and on repeat clicks). On rejection (e.g. clipboard unavailable), do **not** show "Copied!"; the input remains selected so the user can copy manually. Matches the YouTube-style link-field-plus-Copy pattern the issue specifies.

### Placement

- **Pack screen** — `src/features/pack/PackDetailScreen.tsx`: `<ShareButton path={`/packs/${pack.id}`} />` in a flex row alongside the existing **Play** link. Rendered only when `pack.status === "approved"` (a pending/rejected pack has no meaningful public link — matches the issue's approved-only rule and the `PackCard` status-gating precedent). `PackDetailScreen` stays a Server Component composing a client island, exactly like it already does with `VoteButtons`/`CommentSection`.
- **Result screens** — `src/features/result/ResultScreen.tsx` (`GroupResultScreen`) and `src/features/result/RankResultScreen.tsx`: `<ShareButton path={`/packs/${pack.id}/result`} picks={ownPicks} label="Share result" />` alongside the existing **Play again** link, only when `pack.status === "approved"`. When the viewer has no recorded picks (`ownPicks` empty/null), the URL is the plain result link (no `?p=`) — still valid, shows the aggregate.

### Shared-result read path

Both result screens already resolve a `RecordedPick[] | null` (`ownPicks`) to overlay onto the aggregate. This design changes only its *source*:

1. Read the `?p=` param via `useSearchParams()` (client). These routes are already dynamic (`getPackServer`/`getResultsServer` use `cache: "no-store"`), so `useSearchParams` causes no static-render/Suspense deopt — a code comment records this so reviewers don't flag it. **No change to `app/packs/[id]/result/page.tsx`.**
2. Picks source precedence: **if `?p=` decodes to a non-null `RecordedPick[]` → use it (shared mode); else → `readLastPlayPicks(pack.id)` (own mode).**
3. Everything downstream — per-round pick highlight, agreement counts, position histograms — is unchanged; the live aggregate is identical for everyone.

This applies to both the SSR render path (approved pack, normal case for a shared link) and the client `ResultFallback` path. Shared links target approved packs, so they always take the SSR path; the fallback path (pending/rejected) simply never receives a meaningful `?p=`, which is fine.

### Shared-mode copy

When picks come from the URL, the opener is not the sharer, so "Your pick" / "You placed this" would misattribute. In shared mode:

- Show a small note at the top of the result: **"You're viewing a shared result."**
- Neutralize per-round labels: `"Your pick"` → `"Pick"`; `"You placed this #N"` → `"Placed #N"`.

A boolean `shared` flag (true when picks came from the decoded param) is threaded to the two result components to switch this copy. Own mode is byte-for-byte the current behavior.

## Testing plan

Unit / RTL (Vitest), mocking `next/navigation`'s `useSearchParams` and `navigator.clipboard.writeText`:

- **`share-url.test.ts`**: `encodePicks`→`decodePicks` round-trips groups picks and rank picks (with `position`); `decodePicks` returns `null` for empty string, non-base64, valid-base64-non-JSON, JSON-that-isn't-an-array, and array-with-wrong-shape; `buildShareUrl` omits `?p=` when picks are absent/empty and includes it otherwise.
- **`ShareButton.test.tsx`**: click opens popover with the URL in the input; Copy calls `writeText` with the URL and swaps to "Copied!" then reverts; clipboard rejection does not show "Copied!"; outside-click and Escape close the popover (Escape returns focus to the trigger).
- **Result screens (`ResultScreen.test.tsx`, `RankResultScreen.test.tsx`)**: with a valid `?p=` → renders the decoded (sharer's) picks and the "shared result" note with neutralized labels; with no `?p=` → reads sessionStorage as today ("Your pick"); Share button appears only for `status === "approved"`.
- **`PackDetailScreen.test.tsx`**: Share button present for approved packs, absent for pending/rejected.

Manual browser verification (per repo discipline, against the live backend): play a pack to a result, click "Share result", copy the link, open it in a fresh session (logged out), and confirm the sharer's picks render with the "shared result" note and the live aggregate — while the plain `/packs/:id/result` link still shows own/none picks.

No new e2e spec: consistent with the repo's existing result/pack pages (Server-Component `no-store` fetches Playwright's `page.route()` can't intercept, and e2e is gated on `main` PRs only, not `develop`).

## Out of scope

- No social-platform share targets (X, etc.) and no shortened/vanity URLs — copy-link popover only.
- No backend changes (that was the rejected strategy B): no play-record endpoint, no `Pack`/`Play` schema change.
- No change to how plays are recorded or how `sessionStorage` picks are written.
