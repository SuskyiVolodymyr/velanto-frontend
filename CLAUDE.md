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

## Canonical const homes (MIRRORED in velanto-backend — no shared package)
Several closed-set wire-contract constants are hand-mirrored in both repos (deliberately no shared types package — see coding-conventions.md). If one repo's list drifts from the other, requests silently break. `src/shared/types/cross-repo-drift.test.ts` snapshots every entry below to an explicit literal, so changing one forces a conscious update here AND the reciprocal edit in the backend (whose `src/common/cross-repo-drift.spec.ts` fails the same way). That test also asserts the `LOCALES`↔`messages/*.json` invariant. Change both repos together.

| Constant (this repo) | Frontend home | Backend counterpart |
|---|---|---|
| `ROLES` | `src/shared/types/user.ts` | `ROLES` — `src/modules/users/role.ts` |
| `PACK_FORMATS` | `src/shared/types/pack.ts` | `SUPPORTED_FORMATS` — `src/modules/packs/types/format.ts` |
| `PACK_STATUSES` | `src/shared/types/pack.ts` | `PACK_MODERATION_STATUSES` — `src/modules/packs/types/moderation-status.ts` |
| `PACK_TAGS` | `src/shared/types/pack.ts` | `PACK_TAGS` — `src/modules/packs/types/tags.ts` |
| `LOCALES` | `src/i18n/config.ts` (+ `messages/*.json` basenames) | `PACK_LANGUAGES` — `src/modules/packs/types/language.ts` |
| `FEEDBACK_TOPICS` / `FEEDBACK_VISIBILITIES` / `FEEDBACK_STATUSES` / `FEEDBACK_SORTS` | `src/shared/types/feedback.ts` | same names — `src/modules/feedback/types/feedback.ts` |
| `REPORT_TYPES` | `src/shared/types/report.ts` | `REPORT_TYPES` — `src/modules/reports/types/reasons.ts` |
| `REPORT_STATUSES` | `src/shared/types/report.ts` | `REPORT_STATUSES` — `src/modules/reports/types/status.ts` |
| reason ids = `REPORT_REASON_LABELS` keys | `src/shared/lib/report-reasons.ts` | `REPORT_REASONS` — `src/modules/reports/types/reasons.ts` |
| `BAN_REASONS` | `src/shared/types/rules.ts` | `BAN_REASONS` — `src/modules/rules/types/rules.ts` |
| `BanDuration` union / `BAN_DURATIONS` values | `src/shared/lib/users-client.ts` / `src/shared/lib/ban-durations.ts` | `BAN_DURATIONS` — `src/modules/users/ban.ts` |
| `NOTIFICATION_TYPES` | `src/shared/types/notification.ts` | `NOTIFICATION_TYPES` — `src/modules/notifications/types/notification-type.ts` |

FE-only (not mirrored, no BE counterpart): `COVER_TONES`, `RTL_LOCALES`/`LOCALE_NAMES` (display concerns), `REPORT_REASON_LABELS` label *text* (only the ids are the contract).

## Workflow (established discipline)
GitHub issue filed → feature branch → TDD (failing test first) → `pr-review-toolkit:code-reviewer` before merge → PR → merge to `develop` once green → manual browser verification (Playwright plugin) against the live backend before trusting tests alone.
