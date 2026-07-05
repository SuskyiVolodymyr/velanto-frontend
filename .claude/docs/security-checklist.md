# Security Checklist — Frontend (operational, must-follow)

## Never trust the client for authorization
Role-gated UI (Support link for moderators, Admin link for admin/manager, moderation buttons) is a convenience/UX affordance only. The backend enforces every privileged action independently — never assume hiding a button is a security boundary. Don't build any feature whose safety depends on the frontend correctly hiding something.

## Secrets
No API keys, tokens, or backend internals in this repo — see `.claude/docs/public-repo-boundary.md` for the explicit list. Anything server-only stays in `velanto-backend`.

## XSS
Never `dangerouslySetInnerHTML` with unsanitized user content (pack titles/descriptions/comments are user-generated). If rich text is ever needed, sanitize server-side or with a vetted library — plain text rendering by default.

## Auth tokens on the client
Access/refresh tokens: prefer httpOnly cookies set by the backend over storing tokens in `localStorage`/client-readable storage, to reduce XSS token-theft blast radius. If a client-side token store is unavoidable for a specific flow, document why in the PR.

## Third-party content
YouTube embeds and user-uploaded images/videos are untrusted content — sandbox iframes appropriately, validate uploaded file types/sizes client-side (in addition to backend validation, which is the real gate).

## Dependencies
Dependabot enabled; a flagged high/critical vuln is blocking, not backlog.
