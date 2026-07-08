# Popularity filter (frontend) — Design Spec

**Issue:** frontend#56, unblocked by backend#58 (merged to develop: `GET /packs?sort=popular&window=day|week|month|year|all`).

## Goal

Let users sort the home feed by popularity, over a chosen time window, alongside the existing format/tag/search filters.

## Backend contract (already shipped)

- `sort=popular` (optional; omit for default relevance/recency order — unchanged existing behavior)
- `window=day|week|month|year|all` (optional; only meaningful when `sort=popular`; server defaults to `all` if `sort=popular` is sent with no `window`)

## UI

Extends `HomeFeed.tsx`'s existing filter bar (format pills, tag-picker button, search box — all local `useState`, no URL sync).

- **Sort toggle**: a pill button group next to the existing format pills: `Relevance | Popular`. Matches the existing `FORMAT_OPTIONS` pill pattern exactly (same component, same active/inactive styling) rather than introducing a new control type.
- **Window picker**: a second small pill group, `Day | Week | Month | Year | All`, rendered only when `Popular` is active (conditionally mounted, not just visually hidden). Default window when switching to Popular: `week` — a "trending this week" default reads better than an all-time default (which would fossilize into the same top packs forever) or a single day (too volatile for a small pack catalog). This is a UI default, not a backend default — backend's own default when `window` is omitted remains `all`, so the frontend always sends an explicit `window` whenever `sort=popular` is active. The reset to `week` happens on every (re-)selection of Popular, not just the first — including a Relevance → Popular round-trip after a different window was previously chosen — so the "week" default stays a stable, predictable anchor rather than sticky state that could surprise a returning user.
- Switching back to `Relevance` unmounts the window picker and omits both `sort`/`window` from the request (returns to current default behavior, unchanged).
- Design mock precedent: `design/extracted/design_handoff_vilante/screens/Vilante Home.dc.html` shows a `Sort: Popular ▾` label in the filter bar and a `Trending` nav item, confirming popularity-sort belongs in this filter bar. No window-picker mock exists in the handoff — that's a new addition, styled to match the existing pill filters for consistency rather than inventing a new visual language.

## Data flow

- `ListPacksFilters` (in `packs-client.ts`) gains `sort?: 'popular'` and `window?: 'day' | 'week' | 'month' | 'year' | 'all'`.
- `buildListQuery()` gains the two params, following the exact existing `if (filters.x) params.set(...)` pattern used for `format`/`q`.
- `HomeFeed` gains `sort` and `window` state, included in the `useEffect` dependency array that triggers `packsClient.list()`, alongside `format`/`tags`/`query`.
- No new types needed beyond the two new `ListPacksFilters` fields — `window`'s literal union mirrors the backend zod enum exactly.

## Testing

- Unit tests (Vitest + RTL) for `buildListQuery` covering the two new params (present/absent, and window omitted-when-not-popular).
- Component test for `HomeFeed`: switching to Popular sends `sort=popular&window=week` by default; changing window sends the new window; switching back to Relevance omits both params.
- Manual browser verification via Claude Preview: toggle Popular, confirm network request query string and that pack order visibly changes/re-fetches.

## Out of scope

- No URL search-param sync for any filter (matches existing behavior — not introduced by this feature).
- No new pagination UI (matches existing behavior).
