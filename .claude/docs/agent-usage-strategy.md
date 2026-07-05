# Agent Usage Strategy — Frontend

## Why this matters
Spawning a subagent re-derives context from scratch (costs tokens) but keeps that context out of the main session (saves tokens there). It's a net win only when the sub-task is self-contained and the result can be summarized back concisely. Don't spawn for tasks smaller than the overhead of explaining them.

## Delegate to a subagent when
- Broad review pass (`code-reviewer`, `architecture-guardian`, `ui-guardian`, `seo-auditor`) over a diff/PR — needs only the diff and relevant docs, not the main session's history.
- Porting a design-handoff screen: reading the full `.dc.html` reference + `screen-inventory.md` entry is bulky context that doesn't need to stay in the main session once the component is built.
- Research spanning many files with an uncertain answer shape — use `Explore`.

## Handle inline (no subagent) when
- The target file/component is already known — just read/edit it directly.
- The task is small enough that describing it to a subagent costs more tokens than doing it.
- The task depends on conversation context a subagent would have to be re-fed anyway.

## Practical defaults for this repo
- New shared primitive: inline (small, well-defined shape).
- Porting a full screen from the design handoff: one-shot delegate (read the `.dc.html` + relevant `screen-inventory.md` section, implement, report back — don't keep the raw HTML reference in the main session).
- Pre-PR review: `code-reviewer` + `ui-guardian` in parallel (add `seo-auditor` if a public route changed), all scoped to just the diff.

## Subagents do not self-merge
A backgrounded agent may open a PR (small commits, per `.claude/workflows/feature.md`) but must stop there — it does not merge it itself, even if its own local checks (lint/typecheck/build/test) are green. The delegating session reviews the diff and independently re-verifies checks before merging.

This is a hard rule, not a suggestion: the agent that scaffolded this very repo opened and merged its own PR based only on local checks, with no second party reviewing it — the harness itself flagged this as a security concern. The primary session self-merging its *own* direct work (after real CI passes) remains the accepted norm here; the gap is specifically an autonomous agent merging without anyone else looking first. This repo is public — the bar should if anything be higher here than in `velanto-backend`.
