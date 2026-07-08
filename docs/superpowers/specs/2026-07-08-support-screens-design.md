# Support Screens — Design

**Scope:** the moderator report queue at `/support` and report detail at `/support/[id]` — velanto-frontend#29. Backend is fully built and merged (velanto-backend#56, PR #63): `POST /reports`, `GET /reports`, `GET /reports/:id`, `POST /reports/:id/review`, `POST /reports/:id/close`, `DELETE /packs/:id`.

**Written autonomously (2026-07-08, overnight session) per standing authorization.** Grounded in the real design mocks (`Vilante Support.dc.html`, `Vilante Support Report.dc.html`) and the backend's actual shipped response shapes (not the mock's local-storage-backed fantasy data) — where the two disagree, the backend's real capability wins, per this workspace's own `CLAUDE.md` precedent for handling mock/backend mismatches. Self-reviewed; safe to build directly.

## 1. Access and routing

`/support` (queue) and `/support/[id]` (detail) — both gated **moderator+** (`moderator`, `manager`, `admin`), matching `AdminScreen.tsx`'s exact guard pattern (`allowed` computed from `user.role`, `useEffect` redirect for authenticated-but-not-allowed, log-in prompt for unauthenticated, `null` render while loading). Unlike `/admin` (manager+ only), `/support` is deliberately broader — a plain moderator has no `/admin` access but does have report-queue access, matching the backend's own `@Roles('moderator','manager','admin')` gate on every reports endpoint.

Both routes are NOT tabs inside `AdminScreen` — the mock's own header shows "Support" as its own breadcrumb with a "MOD" badge, distinct from "Admin", and this matches the RBAC split (moderator-reachable vs manager+-only).

## 2. Deliberate scope reductions vs. the mock (disclosed)

The mock's `Vilante Support.dc.html`/`Vilante Support Report.dc.html` were built against fabricated `localStorage`-backed data with fields the real backend doesn't return. Three reductions, each because the backend genuinely doesn't expose the field, not by choice:

1. **No free-text search.** The mock's search box filters client-side over locally-stored fake data; the real backend's `GET /reports` only supports `status`/`type` filters (no `q` param). Implementing a fake client-side search over just the current page's 20 items would be misleading (silently missing matches on other pages). Status/type filter chips are real and fully wired; search is dropped.
2. **Target column shows a generic link, not a resolved title/username.** `GET /reports` returns `targetId` only, not a joined pack title or username (resolving that per-row would mean an N+1 fetch per queue row). The TARGET column instead shows `"Pack {shortId}"` / `"User {shortId}"` / `"Round {roundIndex} of pack {shortId}"` as plain text, linking to `/packs/{targetId}` (pack/round) or `/users/{targetId}` (user) — the destination page shows the real title/username once clicked.
3. **No "Reviewed by X" / "Closed by X" username display.** The backend returns `reviewedById`/`closedById` (raw user ids), not resolved usernames (unlike `reporterUsername`, which the backend does flatten). The detail screen shows only the status badge (New/Reviewing/Closed), not a "Taken by @username" line. This is a minor, disclosed simplification, not a functional gap — the audit log (already built) carries the real actor identity for anyone who needs it.

## 3. `/support` — queue screen

- Header: "Reports" title, matching `AdminScreen`'s title styling.
- Filter bar: status chips (All / New / Reviewing / Closed) and type chips (All types / Packs / Users / Rounds), each a toggle button — clicking sets `status`/`type` query state and resets to page 1. Both filters are independent multi-select-look-but-single-select chips (matches the mock: `active` chip highlighted, click sets state, "all" omits the param).
- Table: TYPE / TARGET / REASON / REPORTER / DATE / STATUS columns (matches the mock's 6-column grid). Each row links to `/support/{report.id}`.
  - TYPE: uppercase badge-style text (`PACK`/`USER`/`ROUND`).
  - TARGET: per §2.2 above.
  - REASON: human-readable label via a new `REPORT_REASON_LABELS` map (mirrors `PACK_TAGS`' precedent of duplicating short-canonical-value→label mapping frontend-side, since this repo doesn't import backend types) — e.g. `spam` → "Spam or misleading" (pack) / "Spam or scam" (user), reusing the exact label text from the design mocks' own `REPORT_REASONS` arrays (already extracted verbatim in the backend's design spec).
  - REPORTER: `report.reporterUsername`.
  - DATE: short relative/absolute date, reusing whatever date-formatting helper this repo already has (check `src/shared/lib/` for an existing one before writing a new one — `formatBanStatus`'s `toLocaleDateString()` call is a fallback precedent if nothing dedicated exists).
  - STATUS: badge, three fixed style variants matching the mock's `STATUS_STYLES` (new: accent/cyan, reviewing: amber, closed: neutral gray) — reuse `Badge`'s `className` override pattern (same as `PackCard`'s pending/rejected badges) since `Badge` only has `default`/`accent` variants built in.
- Pagination: "Load more" button + cumulative append, reusing `LogsTab.tsx`'s exact pattern (`{items,total,page,limit}` envelope, dedup-by-id on append) — NOT the mock's client-side full-list pagination, since the backend is server-paginated.
- Empty state: "No reports match these filters."

## 4. `/support/[id]` — detail screen

- Report metadata: type, reason (human label), target (per §2.2, same link), reporter username, comment (if present), created date, current status badge.
- **Queue actions**: "Review" button (visible when `status === 'new'`, calls `POST /reports/:id/review`) and "Mark resolved" button (visible when `status !== 'closed'`, calls `POST /reports/:id/close`) — matches the backend's own `canReview`/`canClose` rules exactly (close doesn't require review first). Both buttons disabled during their own in-flight request; on success, refetch the report (or optimistically update local state from the response) to flip button visibility immediately.
- **Moderation actions** (separate visually-flagged section, matching the mock's red-tinted "MODERATION ACTIONS" box):
  - `type === 'pack'` or `type === 'round'`: "Delete pack" button, calls `DELETE /packs/{targetId}`. On success, show "Pack deleted ✓" in place of the button (matches the mock's `deletePackLabel` state) rather than immediately navigating away — the moderator likely wants to finish reviewing/closing the report next.
  - `type === 'user'`: "Ban user" button, opens the SAME inline expanding ban form already built for `AuthorScreen`/`UsersTab` (duration select from `BAN_DURATIONS`, reason input, "Confirm ban" button) — reuses `usersClient.ban()`. No new ban UI component; extract nothing new, just render the same JSX shape inline here (three call sites now share this shape — worth flagging as a future extraction candidate, not done now to avoid scope creep on this already-large feature).
- Error handling: review/close/delete/ban network failures each show their own inline error message beneath the relevant action, without discarding the button back to a broken state (matches this repo's established "don't optimistically mutate on a call that can fail" convention).
- 404 handling: nonexistent report id → "This report doesn't exist."

## 5. API client additions needed

`src/shared/lib/reports-client.ts` (new):
- `create(input): Promise<Report>` → `POST /reports`
- `list(filters): Promise<ReportList>` → `GET /reports`
- `getById(id): Promise<ReportWithReporter>` → `GET /reports/:id`
- `review(id): Promise<Report>` → `POST /reports/:id/review`
- `close(id): Promise<Report>` → `POST /reports/:id/close`

`packsClient` gains `delete(id): Promise<{deleted: true}>` → `DELETE /packs/:id`.

Types (`src/shared/types/report.ts`, new): `ReportType`, `ReportStatus`, `Report`, `ReportWithReporter`, `ReportList` — mirroring the backend's actual response shapes exactly (field names confirmed from the merged backend PR, not guessed).

## 6. Out of scope for this plan (explicitly, matching backend#56's own boundary)
- The report-SUBMISSION UI (the "Report this pack"/"Report this user"/"Report this round" buttons + modal shown on Pack/Author/Play screens in the mocks) is a SEPARATE piece of work from the moderator-facing queue/detail screens this plan covers. It's real, valuable, and directly unblocks the reason this backend exists — but it touches 6+ different existing screens (Pack detail, Author, and all 4 Play variants) rather than being new standalone screens, so it's being scoped as its own immediate follow-up plan, not bundled into this one.

## Issue breakdown
This plan covers the moderator-facing half of frontend#29 (queue + detail screens). The report-submission UI is deferred to an immediate follow-up (see §6).
