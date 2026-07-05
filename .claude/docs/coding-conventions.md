# Coding Conventions — Frontend

## Folder structure
`app/` = routes only. `src/features/<domain>/` = feature-local UI/logic (create, play, pack, profile, admin, support). `src/shared/{components,hooks,lib,types}` = genuinely reused primitives.

## Component philosophy
Single Responsibility, small components. If you can describe a component's job with "and," split it. Promote a feature-local component to `shared/` when you're confident it'll be reused (not speculatively for every component).

## Shared primitives (build these first)
`Button`, `Text`, `Input`, `Card`, `Badge` under `src/shared/components/`. All screens compose from these rather than re-implementing button/text styles inline.

## Typing — one type per entity
Every entity (`User`, `Pack`, `Item`, etc.) has exactly one canonical type in `src/shared/types/`, used everywhere in this repo. This repo does NOT share types with `velanto-backend` (separate repos, separate type definitions, per project decision) — but internally, zero duplication.

## State management
Local component state for UI-only concerns. Lift to a feature-level hook/context when shared across sibling components. No global state library until an actual cross-feature need proves necessary — don't add one speculatively.

## Styling
Tailwind, driven by the design tokens in `.claude/docs/design-tokens.md`. Accent color as a CSS var (`--acc`) — themeable, never hardcode `#00e5ff` directly in a component.

## Data fetching
Through `src/shared/lib/api-client.ts` only. Server Components fetch directly where possible (better for SEO/perf); Client Components only when interactivity requires it.
