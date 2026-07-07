# Docs screen — design

## Goal
Implement the Docs screen (velanto-frontend#31, `screen-inventory.md` #15) — a static help/documentation page with a topic sidebar. Public route, no auth required, no backend calls at all.

## Scope decision: omit the "AI integration (MCP)" topic
`Vilante Docs.dc.html`'s DEVELOPERS section documents an MCP server, a per-user API key, and a set of `/v1/packs` REST endpoints for AI-assisted pack creation. **None of this exists in Velanto** — there is no API-key system, no MCP server, and it is not on the backlog (not in any filed GitHub issue for either repo). This mirrors a decision already made repeatedly in this project: omit UI for capabilities with no real backend behind them rather than fake it (OAuth buttons dropped from Auth, search/notifications/user-menu dropped from Home, no fake AI-themed pack analysis on the Pack detail page). The other 4 topics — Getting Started, Creating a Pack, Formats Explained, Playing Packs, Stats & Comparisons — are all static prose describing real, already-shipped mechanics, so they ship as-is.

## Structure
A two-column layout: a sticky sidebar nav grouped into sections (`OVERVIEW`, `CREATORS`, `PLAYERS`), and a content pane that swaps based on the selected topic. All client-side state (`activeTopic`), no data fetching — content is static copy, defined as a plain data structure in the component file (this is prose content, not something requiring its own type module).

Topics (5, mirroring the mock minus the AI section):
- `start` (OVERVIEW) — "Getting started": what Velanto is, three feature callout cards (Build a pack / Play blind / Compare after).
- `creating` (CREATORS) — "Creating a pack": fixed items vs. tag-pool items, item types.
- `formats` (CREATORS) — "The five formats": one card per format (Save One, Sacrifice One, Rank Blind, NxN, 1v1), name + one-line description each — this list is genuinely static prose (not derived from `FORMAT_LABELS`, since the mock's descriptions are full sentences, not the short label).
- `playing` (PLAYERS) — "Playing a pack".
- `stats` (PLAYERS) — "Stats & comparisons".

## Component
- `src/features/docs/DocsScreen.tsx` (new, client component): owns `activeTopic` state, renders the sidebar nav (topic buttons, active-state styling matching the existing tab-toggle pattern used elsewhere — e.g. `GroupEditor.tsx`'s Random/Manual toggle) and the content pane. Real `<button>` elements for each nav item (not `div onClick`), `aria-pressed` on the active one, matching this repo's established a11y bar.
- `app/docs/page.tsx` (new): a thin Server Component — just `export const metadata` (`title: "Docs"`) and renders `<DocsScreen />`. No `getPackServer`-style fetch, no auth gate (this route is public, matching the mock's own lack of an auth check — unlike Play/Create which redirect unauthenticated users, Docs is pure reference content anyone should be able to read).

## Testing
- `DocsScreen.test.tsx`: renders the "Getting started" topic by default; clicking a different sidebar topic (e.g. "Formats explained") swaps the visible content and marks that nav button `aria-pressed`; the "Formats explained" topic lists all 5 format names.
- No test needed for `app/docs/page.tsx` itself (thin static shell, same reasoning as other route files in this repo — nothing meaningful to unit-test beyond what `DocsScreen.test.tsx` already covers).

## Self-review
- No placeholders/TBDs.
- Explicitly resolves the one real ambiguity (the AI/MCP section) with a documented, precedented reason rather than silently dropping it or silently including fake content.
- Scoped as a single self-contained screen with zero backend dependency — appropriate given the current backlog is otherwise concentrated on features that DO need backend work not yet done (Profile, Author, Settings' real permission model, Support, Admin).
