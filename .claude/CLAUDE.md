# Velanto Frontend — Navigation

Next.js (App Router) + TypeScript + Tailwind frontend for the Velanto elimination-quiz-pack platform. Open-source. Sibling repo: `velanto-backend` (private, no code shared between them).

This file is index-only. Read a doc below only when its topic is actually relevant to the current task — don't preload everything.

## Conventions (must-follow, read before writing code)
- Component philosophy, primitives, state rules: `.claude/docs/coding-conventions.md`
- Security rules (never trust client role, no secret leakage, XSS): `.claude/docs/security-checklist.md`
- Testing requirements (Vitest+RTL+Playwright, adversarial mandate): `.claude/docs/testing-requirements.md`
- Branching, commits, PR rules: `.claude/docs/git-workflow.md`
- When to delegate to a subagent vs work inline: `.claude/docs/agent-usage-strategy.md`
- **What must NEVER be committed to this public repo**: `.claude/docs/public-repo-boundary.md` — read this before adding anything that touches moderation logic, internal API details, or secrets.

## Reference (read on demand)
- Full design token catalog (colors/spacing/radius/motion): `.claude/docs/design-tokens.md`
- 17-screen inventory + per-screen component/state needs: `.claude/docs/screen-inventory.md`

## Recurring task playbooks
- New feature: `.claude/workflows/feature.md`
- Bug fix: `.claude/workflows/bugfix.md`
- Opening a PR: `.claude/workflows/pull-request.md`
- Cutting a release (develop → main): `.claude/workflows/release.md`

## Custom review agents
- `code-reviewer` — Next.js/React conventions: `.claude/agents/code-reviewer.md`
- `architecture-guardian` — app/ vs features/ vs shared/ boundaries: `.claude/agents/architecture-guardian.md`
- `ui-guardian` — component size/SRP + design-token adherence + a11y: `.claude/agents/ui-guardian.md`
- `seo-auditor` — metadata/sitemap/JSON-LD/Core Web Vitals: `.claude/agents/seo-auditor.md`

## Design source
Original design handoff (HTML references, not production code): `../velanto` design repo / see `design-tokens.md` and `screen-inventory.md` for the extracted specifics. Screens currently reference the placeholder brand name "Vilante" — rename to "Velanto" is a deliberate, tracked task when each screen is actually implemented, not done in bulk.

## Project state
As of this writing: infra scaffolding in progress, no product features yet.
