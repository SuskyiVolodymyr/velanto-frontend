# Workflow: New Feature

1. Confirm/create the GitHub Issue describing the feature (link it in the PR later).
2. Branch from `develop`: `git checkout develop && git pull && git checkout -b feature/<short-name>`.
3. Read relevant docs before writing code: `.claude/docs/coding-conventions.md`, `.claude/docs/public-repo-boundary.md` if it touches anything security/moderation-adjacent, `.claude/docs/design-tokens.md` + `.claude/docs/screen-inventory.md` if porting a design-handoff screen.
4. Implement, using shared primitives where they exist, promoting new ones only when reuse is likely.
5. Write tests immediately (see `.claude/docs/testing-requirements.md`).
6. Run `npm run lint && npm run typecheck && npm test && npm run build` locally — all green before opening a PR.
7. Run `code-reviewer` + `ui-guardian` on the diff (add `seo-auditor` if a public route changed).
8. Open PR into `develop` per `.claude/workflows/pull-request.md`.
