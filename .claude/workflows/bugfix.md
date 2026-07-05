# Workflow: Bug Fix

1. Reproduce the bug first — write a failing test that captures it before touching implementation code.
2. Branch from `develop`: `git checkout -b fix/<short-name>`.
3. Fix the minimal code needed to make the failing test pass. Don't refactor unrelated code in the same PR.
4. Add a regression test if the failing test from step 1 doesn't already serve as one.
5. Run `npm run lint && npm run typecheck && npm test` — all green.
6. Open PR into `develop` per `.claude/workflows/pull-request.md`.
