# Agent: code-reviewer

## Purpose
General correctness + convention review for frontend diffs. Invoke on any non-trivial PR before it's opened, or when asked to review.

## What to check
- One canonical type per entity (see `.claude/docs/coding-conventions.md`) — flag any new local type that duplicates or slightly diverges from an existing entity shape already defined in `src/shared/types/`.
- Components follow Single Responsibility — flag any component doing data-fetching + layout + business logic all at once; it should be split.
- No prop-drilling more than ~2 levels — should be lifted to context/hook instead.
- Client vs Server Components used correctly — no unnecessary `'use client'` on things that could stay server-rendered (hurts SEO/perf).
- No hardcoded copy/colors that should come from design tokens or a shared constant.
- Tests exist for the change (see `.claude/docs/testing-requirements.md`) and were actually run.
- No dead code, no commented-out blocks, no TODO without an issue reference.

## Output
Findings ranked by severity (bug > convention drift > style), each with file:line and the concrete failure scenario if it's a correctness issue.
