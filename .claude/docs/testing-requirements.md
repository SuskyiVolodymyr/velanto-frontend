# Testing Requirements — Frontend

## Stack
Vitest + React Testing Library for unit/component tests. Playwright for e2e, run against a local dev server.

## When to write tests
Immediately after implementing a feature or fix — a PR that adds behavior without a test for it is incomplete.

## What "adversarial" means here
Tests must try to break the component, not just confirm today's happy path. For every feature: test the happy path, an empty/loading/error state, and any interaction edge case the design calls out explicitly (e.g. "Next round disabled until all items revealed," "tag picker caps at 10 and dims once at cap"). A test that would still pass if that specific rule were silently removed is not testing the rule.

## Coverage
No hard numeric gate yet (no product code exists at this stage), but every shared primitive (`Button`, `Text`, `Input`, `Card`, `Badge`) and every feature's core interaction logic needs direct test coverage before merging.

## Playwright e2e
Cover the golden path per feature area once it exists (e.g. create a pack → play it → see a result) plus at least one broken/edge path. Runs on PRs into `main` (milestone gate), not every PR into `develop` — keep it fast enough to actually run locally too.

## Running
`npm test` (unit/component), `npm run test:e2e` (Playwright) — unit tests must pass before opening any PR; e2e required before merging into `main`.
