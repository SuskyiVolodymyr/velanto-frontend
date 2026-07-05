# Velanto Frontend — Codebase Map

Next.js App Router + TypeScript + Tailwind client for Velanto. Talks to `velanto-backend`.
Read this before spawning an Explore agent for orientation — it should cover "where does X live" questions directly.

## Stack
- Next 16 (App Router), React 19
- Vitest + React Testing Library for unit/component tests; Playwright for e2e (`e2e/*.spec.ts`)
- Tailwind v4

## Layout
```
app/                            routes (Server Components, thin — fetch + render a feature component)
  page.tsx                      home feed
  auth/page.tsx
  create/page.tsx
  packs/[id]/page.tsx            pack detail (uses getPackServer)
  packs/[id]/play/page.tsx       play screen (uses getPackServer)
  packs/[id]/result/page.tsx     result screen (uses getPackServer + getResultsServer)
src/
  features/
    auth/AuthForm.tsx
    create/CreatePackForm.tsx    format toggle (currently save_one/sacrifice_one ONLY — no nxn yet), owns groups state
    create/GroupEditor.tsx       group name/selectionMode/sampleSize/items editor, used by CreatePackForm
    home/HomeFeed.tsx, PackCard.tsx
    play/PlayScreen.tsx          gameplay state machine (roundIndex/revealed/selectedId/picks), round-sampling.ts (manual vs random-shuffle candidate resolution)
    result/ResultScreen.tsx      reads sessionStorage (via last-play-storage.ts) in a useEffect for "your pick" vs aggregate fallback
  shared/
    lib/
      api-client.ts, auth-client.ts, packs-client.ts, plays-client.ts   fetch wrappers to the backend
      get-pack-server.ts, get-results-server.ts                        Server-Component-only fetches (cache: "no-store")
      last-play-storage.ts        sessionStorage read/write for recorded picks, keyed `velanto:last-play:${packId}`
      cn.ts, jsonld.ts
    types/
      pack.ts       PackFormat = "save_one" | "sacrifice_one" — does NOT include "nxn" yet; Group interface only, no Category/versusRounds/versusN types
      play-results.ts, user.ts, index.ts
```

## Scripts
`npm run dev` · `npm test` (vitest) · `npm run test:e2e` (playwright) · `npm run typecheck` · `npm run lint`

## Known gaps (as of NxN backend landing, pre-frontend-support)
Backend already supports the `nxn` format fully (categories/versusRounds/versusN, see `velanto-backend/CLAUDE.md`). Frontend does NOT yet:
- include `"nxn"` in `PackFormat` (`src/shared/types/pack.ts`)
- model `Category`/`versusRounds`/`versusN` types
- send those fields from `CreatePackInput` (`src/shared/lib/packs-client.ts`)
- render a Categories editor or conditionally swap Groups↔Categories UI in `CreatePackForm.tsx` (format toggle currently just changes state, doesn't change rendered fields)
- support nxn in Play/Result screens (backend also rejects nxn there — out of scope until backend adds it)

## Workflow (established discipline)
GitHub issue filed → feature branch → TDD (failing test first) → `pr-review-toolkit:code-reviewer` before merge → PR → merge to `develop` once green → manual browser verification (Playwright plugin) against the live backend before trusting tests alone.
