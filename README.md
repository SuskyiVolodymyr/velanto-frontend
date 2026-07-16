# Velanto Frontend

Web client for **Velanto**, an elimination-quiz-pack platform. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4.

Talks to the `velanto-backend` API. Private repository.

## Quick start

The backend must be running first (see its README — it serves on `:3001` locally).

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev                    # http://localhost:3000
```

## Environment

`.env.example` documents everything. Only one var matters locally:

| Var                   | Notes                                 |
| --------------------- | ------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` — the backend |

Everything else is optional and has a working default: `NEXT_PUBLIC_MEDIA_BASE_URL` (only needed to render uploaded images), `NEXT_PUBLIC_SITE_URL` (canonical/OG URLs, defaults to `https://playvelanto.com`), and the Sentry group (unset ⇒ not initialised; also **off by default in development** even with a DSN — set `NEXT_PUBLIC_SENTRY_ENABLED=true` to opt in locally).

`NEXT_PUBLIC_*` vars are exposed to the browser bundle; the bare counterparts cover SSR and route handlers. Where both exist, they hold the same value.

## Scripts

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | dev server on :3000                                   |
| `npm run build`        | production build                                      |
| `npm test`             | unit/component tests (Vitest + RTL)                   |
| `npm run test:watch`   | Vitest in watch mode                                  |
| `npm run test:e2e`     | Playwright e2e                                        |
| `npm run typecheck`    | `tsc --noEmit`                                        |
| `npm run lint`         | eslint                                                |
| `npm run format:check` | prettier check — **CI runs this; it fails the build** |
| `npm run format`       | prettier write                                        |

## Layout

```
app/                  routes — thin Server Components: fetch, then render a feature
src/
  features/<name>/    one directory per surface (home, pack, play, create, docs,
                      settings, admin, moderation, auth, profile, …), each owning
                      its components, tests, and an api/ dir of queries
  shared/
    components/       design-system primitives (Button, Card, Modal, Tooltip, …)
    lib/              api-client + one *-client.ts per domain, auth-context,
                      query-client/provider, get-*-server.ts (Server-Component
                      fetches, cache: "no-store")
    types/            wire contracts (pack.ts, user.ts, …)
  i18n/               locale config + catalogs.test.ts
messages/             11 locale catalogs (en.json is the source of truth)
e2e/                  Playwright specs
```

`CLAUDE.md` has the fuller map, including the domain model (pools → rounds → slots) and the cross-repo constants table.

## Testing

Two suites, and **both** gate a PR:

- **Vitest** (`npm test`) — units and components.
- **Playwright** (`npm run test:e2e`) — real flows. Uses port **3100**, so it won't collide with `next dev`; stop any dev server on 3100 first. A single mock backend is shared via `e2e/global-setup.ts` — never bind `:3001` per-spec.

If you change a flow's UI or copy, update `e2e/` too. Vitest passing is not sufficient.

`src/i18n/catalogs.test.ts` enforces the i18n contract: every locale has exactly `en.json`'s key set, placeholders match, and **no string may be left identical to its English source**. Adding a key means adding it to all 11 catalogs.

## Conventions

- **CI is the gate.** Green locally isn't enough; the PR's check-runs are what count.
- Branch from `develop`, PR into `develop`. `main` is the release branch.
- A `pre-push` hook (wired by `npm install`) runs the fast checks. On Windows it reports false prettier failures on files you never touched (autocrlf CRLF vs prettier's LF) — the committed blobs are LF-clean and CI passes. Push with `--no-verify` when that's the only complaint.
- Some closed-set constants (roles, formats, statuses, tags, locales) are **hand-mirrored** from `velanto-backend` with no shared package — deliberately. `src/shared/types/cross-repo-drift.test.ts` fails if one side drifts; change both repos together. Table in `CLAUDE.md`.
- Signed-out users see actions **blocked with a reason** (dimmed + `aria-disabled` + a `Tooltip`), never hidden and never a surprise redirect to `/auth`.
