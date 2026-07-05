# Public Repo Boundary — What Must NEVER Land Here

This repo is open-source and public. `velanto-backend` is private. Getting this wrong leaks information that helps abuse the platform or compromises accounts.

## Never commit
- Any API key, JWT secret, database URL, or `.env` file (real or containing real-looking values — even as an "example" with a plausible-looking secret).
- Backend internals: RBAC matrix specifics, audit-log schema, rate-limit thresholds, moderation-detection heuristics (anything that tells a bad actor how to evade moderation or brute-force auth).
- Real user data of any kind (emails, IDs, screenshots containing real accounts) in test fixtures, screenshots, or issue reports.
- Internal architecture rationale documents from `velanto-backend` (`architecture-rationale.md`, `rbac-matrix.md`, `domain-rules.md` there are intentionally not mirrored here beyond what's needed for the frontend to function).

## Fine to have here (public by design)
- API *shape*/types needed to call the backend (endpoint paths, request/response field names) — this is unavoidable for an open-source client and is not itself a secret.
- Design tokens, screen inventory, UI copy.
- Standard OSS project files (LICENSE, CONTRIBUTING, issue templates).

## Before every PR
Re-check the diff for anything above. If unsure whether something is safe to publish, default to keeping it out and ask, rather than committing and fixing later — public-repo history is hard to fully scrub.
