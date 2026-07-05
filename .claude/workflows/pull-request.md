# Workflow: Opening a Pull Request

## PR target
Into `develop` (never directly into `main`).

## PR description must include
- What changed and why (one paragraph).
- `Closes #<issue-number>`.
- How it was tested (test files + manual verification steps for any UI exercised by hand).
- Any follow-up work deliberately deferred (link a new issue, don't leave it implicit).

## Before opening
- `npm run lint && npm run typecheck && npm test && npm run build` all green locally.
- **Re-read `.claude/docs/public-repo-boundary.md` and check the diff against it** — this repo is public.
- Relevant review agent(s) run: `code-reviewer` + `ui-guardian` always; `seo-auditor` if a public route changed; `architecture-guardian` if new routes/cross-feature imports were added.
- No secrets, `.env` files, or debug `console.log`/commented-out code left in the diff.

## After opening
CI must pass (lint, typecheck, test, build) before merge. Squash-merge into `develop` once green and reviewed.
