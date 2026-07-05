# Git / GitHub Workflow — Frontend

## Branches
- `main` — production-milestone only. Never commit directly.
- `develop` — integration branch. Feature/bugfix branches merge here via PR.
- `feature/<short-name>` / `fix/<short-name>` — branched from `develop`.

## Commits
Commit each meaningful action separately. Conventional-ish messages: `feat: ...`, `fix: ...`, `chore: ...`, `test: ...`, `docs: ...`.

## Pull requests
Every change lands via PR into `develop`. Before opening, re-read `.claude/docs/public-repo-boundary.md` — this repo is public, double-check nothing sensitive is in the diff. PR description: what changed, why, how it was tested, `Closes #N`.

## CI gate
PRs must pass: install, lint, typecheck, test, build. PRs into `main` additionally run the Playwright e2e job.

## Issues
GitHub Issues are the live backlog — file one per task, close it via the PR that resolves it.

## Releases
`develop` → `main` only at a milestone, via `.claude/workflows/release.md`.
