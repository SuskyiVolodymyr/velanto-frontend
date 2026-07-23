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
  page.tsx                      home feed          admin/, moderation/     staff panels
  auth/  create/  settings/     account/  profile/  notifications/  docs/  rules/
  feedback/  users/[id]/        terms/  privacy/
  packs/[id]/page.tsx            pack detail (uses getPackServer)
  packs/[id]/edit/page.tsx       author edit (re-moderates on save)
  packs/[id]/play/page.tsx       play screen (uses getPackServer)
  packs/[id]/result/page.tsx     result screen (uses getPackServer + getResultsServer)
src/
  features/                     one dir per surface: account admin auth author create docs feedback
                                home legal moderation notifications pack play profile result rules
                                settings share support
    create/CreatePackForm.tsx    owns pools+rounds state; FormatSection, PoolsSection,
                                 RoundsEditor, VersusEditor, GroupEditor split out of it
    create/create-pack.schema.ts  + .refinements.ts / .value-schemas.ts — the create contract and its limits
    docs/DocsScreen.tsx          topic list + article; topic lives in the URL (?topic=)
    docs/ApiTokensSection.tsx    PAT manager (embedded in the API docs topic, not settings)
    play/round-sampling.ts       slot draw engine (manual pins vs random shuffle, cross-round dedup)
    result/ResultScreen.tsx      reads sessionStorage (via last-play-storage.ts) for "your pick" vs aggregate fallback
  shared/
    lib/
      api-client.ts + *-client.ts   fetch wrappers to the backend (one per domain)
      get-pack-server.ts, get-results-server.ts   Server-Component-only fetches (cache: "no-store")
      last-play-storage.ts        sessionStorage read/write for recorded picks, keyed `velanto:last-play:${packId}`
      auth-context.tsx, query-client.ts, query-provider.tsx
    types/
      pack.ts       PACK_FORMATS (six — five UI + save_one_friends), UiPackFormat/isUiPackFormat,
                    Group (= a Pool), Round, Slot; PACK_STATUSES, PACK_TAGS
      play-results.ts, user.ts, index.ts
```

## Scripts

`npm run dev` · `npm test` (vitest) · `npm run test:e2e` (playwright) · `npm run typecheck` · `npm run lint`

## Domain model: pools and rounds

Five of the six formats are supported end to end (see "The sixth format" below). The pre-redesign vocabulary ("categories", item tags, `selectionMode`/`sampleSize` on a group) is **gone** — don't reintroduce it:

- **Pool** (`Group` in code, "Pool" in the UI) — a named bag of items, nothing more. It does not decide how many items appear or when.
- **Round** — an ordered list of **slots** plus an optional label. Slot count is fixed per format: 1 for `save_one`/`sacrifice_one`/`rank_blind`, exactly 2 for `nxn`/`1v1` (the same two distinct pools in every round).
- **Slot** — points at one pool via `groupId` with a `mode`: `random` draws `count` items and reshuffles each play; `manual` shows exactly the author's ordered `itemIds`, which are pinned globally (no random slot anywhere can draw them). Random slots sharing a pool never repeat an item across rounds.
- Limits live in `create-pack.value-schemas.ts`: elimination draws 2–8, nxn 1–8 per side, 1v1 locked to 1.

Publishing is not instant: a new or edited pack enters moderation as `pending` unless the author is trusted/staff. Anonymous visitors can play, and their plays **are** recorded — stored with a null player, so they count toward the pack's stats but belong to no one's history ([#221](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/221)). The community breakdown on `/result` is gated on evidence that you finished the pack — a local record of your play, or a `?p=` share code ([#222](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/222)).

## Canonical const homes (MIRRORED in velanto-backend — no shared package)

Several closed-set wire-contract constants are hand-mirrored in both repos (deliberately no shared types package — see coding-conventions.md). If one repo's list drifts from the other, requests silently break. `src/shared/types/cross-repo-drift.test.ts` snapshots every entry below to an explicit literal, so changing one forces a conscious update here AND the reciprocal edit in the backend (whose `src/common/cross-repo-drift.spec.ts` fails the same way). That test also asserts the `LOCALES`↔`messages/*.json` invariant. Change both repos together.

| Constant (this repo)                                                                 | Frontend home                                                        | Backend counterpart                                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `ROLES`                                                                              | `src/shared/types/user.ts`                                           | `ROLES` — `src/modules/users/role.ts`                                         |
| `PACK_FORMATS` (six — **not** all UI-visible, see below)                             | `src/shared/types/pack.ts`                                           | `SUPPORTED_FORMATS` — `src/modules/packs/types/format.ts`                     |
| `PACK_STATUSES`                                                                      | `src/shared/types/pack.ts`                                           | `PACK_MODERATION_STATUSES` — `src/modules/packs/types/moderation-status.ts`   |
| `PACK_TAGS`                                                                          | `src/shared/types/pack.ts`                                           | `PACK_TAGS` — `src/modules/packs/types/tags.ts`                               |
| `LOCALES` — **subset, not a mirror** (see below)                                     | `src/i18n/config.ts` (+ `messages/*.json` basenames)                 | `PACK_LANGUAGES` — `src/modules/packs/types/language.ts`                      |
| `FEEDBACK_TOPICS` / `FEEDBACK_VISIBILITIES` / `FEEDBACK_STATUSES` / `FEEDBACK_SORTS` | `src/shared/types/feedback.ts`                                       | same names — `src/modules/feedback/types/feedback.ts`                         |
| `REPORT_TYPES`                                                                       | `src/shared/types/report.ts`                                         | `REPORT_TYPES` — `src/modules/reports/types/reasons.ts`                       |
| `REPORT_STATUSES`                                                                    | `src/shared/types/report.ts`                                         | `REPORT_STATUSES` — `src/modules/reports/types/status.ts`                     |
| reason ids = `REPORT_REASON_LABELS` keys                                             | `src/shared/lib/report-reasons.ts`                                   | `REPORT_REASONS` — `src/modules/reports/types/reasons.ts`                     |
| `BAN_REASONS`                                                                        | `src/shared/types/rules.ts`                                          | `BAN_REASONS` — `src/modules/rules/types/rules.ts`                            |
| `BanDuration` union / `BAN_DURATIONS` values                                         | `src/shared/lib/users-client.ts` / `src/shared/lib/ban-durations.ts` | `BAN_DURATIONS` — `src/modules/users/ban.ts`                                  |
| `NOTIFICATION_TYPES`                                                                 | `src/shared/types/notification.ts`                                   | `NOTIFICATION_TYPES` — `src/modules/notifications/types/notification-type.ts` |

FE-only (not mirrored, no BE counterpart): `COVER_TONES`, `RTL_LOCALES`/`LOCALE_NAMES` (display concerns), `REPORT_REASON_LABELS` label _text_ (only the ids are the contract).

**`LOCALES` is the one exception to "mirror".** It is a **subset** of the backend's `PACK_LANGUAGES`, not equal to it:

```
LOCALES (8: en zh hi ar bn ru ur uk)  ⊆  PACK_LANGUAGES (11: + es fr pt)
```

They're different things that were identical until [#226](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/226): `LOCALES` = languages the **interface** is translated into; `PACK_LANGUAGES` = the language a user's **pack content** is in. Shipping the UI in an EU language is what makes a Ukraine-established operator "target" EU data subjects (GDPR Recital 23), so es/fr/pt were dropped from the interface — but a pack may still be _labelled_ Spanish, because user-generated metadata carries no targeting signal. See `docs/superpowers/specs/2026-07-16-legal-docs-research.md`.

**The subset direction is load-bearing**: a new pack defaults to its author's interface language, so every `LOCALE` must be a legal `PACK_LANGUAGE`. The reverse need not hold. Both repos assert this from their own side. Restoring a locale means restoring its `messages/*.json` from git history _and_ re-adding it here — it's a ~10-minute job, deliberately.

## The sixth format: `save_one_friends` is created like the rest, played only in a room

`PACK_FORMATS` has **six** entries, all six now creatable/editable in the form. `save_one_friends` (room-based multiplayer, 2-4 friends — velanto-backend#258) is the one whose **play** happens in a live room, not on the single-player `/play` path (velanto-frontend#368).

Two types, and the difference still matters — but it's a READ-side split now, not write-side:

- `PackFormat` — the full wire union; `Pack.format` is this. The **write** side (creator picker, create schema, filter rows, label maps) accepts all six.
- `UiPackFormat` = `Exclude<PackFormat, "save_one_friends">` — the formats with a **single-player play path**. Read/routing paths that pick a `/play` screen narrow with `isUiPackFormat()` from `src/shared/types/pack.ts` (never a cast); `save_one_friends` is routed to a room instead.

**Creating one:** pick "Save One (Friends)" in the creator — its body (`FriendsRoundsEditor`) is single-slot random rounds with no count (the room shows players+1), and every pool needs ≥5 items. Backend rules are mirrored in `create-pack.refinements.ts` (`validateFriends`). Packs can also be authored over the API — `velanto-pack-creator` via the `velanto-mcp` server.

**Playing one:** the pack detail page shows a room entry (`FriendsRoomEntry`) instead of a Play button; `/packs/[id]/play` 404s for it by design (see `PlayRouter`). It has a real label, "How it plays" steps, and a create blurb in every locale; it has no single-player play *instruction* copy (`play-format-copy.ts` maps it to `""`).

## Workflow (established discipline)

GitHub issue filed → feature branch → TDD (failing test first) → `pr-review-toolkit:code-reviewer` before merge → PR → merge to `develop` once green → manual browser verification (Playwright plugin) against the live backend before trusting tests alone.
