# Workflow: Release (develop → main)

1. Confirm `develop` is green (CI passing) and contains everything intended for this milestone.
2. Open a PR from `develop` into `main`.
3. Run the full Playwright e2e suite (milestone gate — runs only on PRs into `main`).
4. On merge, tag the commit on `main` (`vX.Y.Z`) matching the milestone.
5. Verify prod env vars (backend API base URL, etc.) are current before/at deploy.
6. Note the release in the relevant GitHub Issue(s) it closes.
