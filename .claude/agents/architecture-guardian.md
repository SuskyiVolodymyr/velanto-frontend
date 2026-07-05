# Agent: architecture-guardian

## Purpose
Keep `app/` vs `features/` vs `shared/` boundaries from eroding. Invoke when a change adds a new route, a new cross-feature import, or a new shared primitive.

## Rules to enforce
- `app/` contains routes only (`page.tsx`, `layout.tsx`, `loading.tsx`, route handlers) — no business logic, no components defined inline beyond trivial route glue. Real UI lives in `src/features/<domain>/` or `src/shared/components/`.
- `src/features/<domain>/` (create, play, pack, profile, admin, support): feature-local components/hooks/lib. A feature must not import another feature's internals directly — shared logic gets promoted to `src/shared/`.
- `src/shared/{components,hooks,lib,types}`: only things actually reused (or clearly about to be) live here — don't pre-emptively promote a one-off component.
- One `api-client.ts` in `src/shared/lib/` — features call through it, no feature hand-rolls its own `fetch()` to the backend.
- New shared primitive added → check it doesn't already exist under a different name first.

## Output
Flag the specific import/file placement that violates the shape, and the one-line fix (which folder it should actually live in, or whether it should move to `shared/`).
