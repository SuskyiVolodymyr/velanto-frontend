# Moderation panel — combine /support + /moderation into one tabbed panel

**Status:** APPROVED by the user 2026-07-14 — not started. Build straight from this doc.
**Repos:** velanto-frontend (bulk) + velanto-backend (filters, counts).

**Explicitly approved:** the FIFO flip (pack queue → oldest-first + sort toggle), the new
`GET /moderation/counts` endpoint for tab badges, and URL-driven tab state (`?tab=`).
Everything in Decisions below is signed off; don't re-litigate it, just build it.

**Suggested build order:** backend first (queue filters + FIFO + counts endpoint), then the
`shared/` table promotion, then the panel shell + Reports tab, then Pack approvals, then the
`/support` redirects + header nav. One PR per repo, or split the FE if it gets large.

## Problem

Staff moderation is split across two unrelated screens with two different visual languages:

| Route | What it is | Shape today |
|---|---|---|
| `/support` | Reports queue (+ `/support/[id]` detail) | Filter chips + div rows. Closest of the two to its mock. |
| `/moderation` | Pack-approval queue | An `<h1>` and a list. No filters, no pagination. |

Both gate on **moderator+**. Neither looks like the admin panel we just rebuilt. A moderator has to know which of two URLs holds the work.

## Ground truth

- **Reports** has a design mock: `design/extracted/design_handoff_vilante/screens/Vilante Support.dc.html` ("SUPPORT QUEUE / Reports") — table **TYPE / TARGET / REASON / REPORTER / DATE / STATUS**, status+type filter chips, Previous/Next pagination. There's also `Vilante Support Report.dc.html` for the detail screen.
- **Pack approvals has NO mock.** The design's only moderation surface is Support/Reports. So that tab is ours to invent — it must match the admin/table style rather than a mock.

## Decisions

1. **One panel at `/moderation`.** Admin-panel shell: eyebrow + heading + underline tabs + the shared table + filters + pagination.
2. **Tabs: `Reports` | `Pack approvals`.** Feedback-board triage is *not* a tab — the board already has inline staff controls at `/feedback`. Revisit later if wanted.
3. **Tab state lives in the URL** (`/moderation?tab=reports|packs`), unlike the admin panel's local state. Moderation gets linked to (from notifications, from a teammate), so a tab must survive a refresh and be shareable. Default tab = `reports`.
4. **`/support` and `/support/[id]` redirect** into the panel. Report detail moves to `/moderation/reports/[id]`. These are `noindex` staff pages, so there's no SEO cost to moving them.
5. **Promote the table primitives out of `features/admin` into `shared`.** `AdminTable`/`AdminTableRow`/`AdminPagination` → `src/shared/components/DataTable.tsx` + `TablePagination.tsx`. Required, not cosmetic: `shared/` may not import from `features/` (architecture rule), and both panels need them. Admin imports get updated in the same PR.
6. **Access stays moderator+.** The admin panel remains separate and manager/admin-only — different audience, different job.
7. **Pack queue becomes FIFO** (oldest submission first). *Verified:* it is currently `createdAt: 'desc'` — newest-first, which starves the backlog: an old pack can sit unreviewed forever while new ones jump the line. Flip the default to oldest-first and offer a sort toggle.

## Tabs

### Reports (from `/support`)
Straight port to the mock: table **TYPE / TARGET / REASON / REPORTER / DATE / STATUS**, status chips (All/New/Reviewing/Closed) + type chips (All/Packs/Users/Rounds), Prev/Next. Row click → `/moderation/reports/[id]`. Existing `use-report-moderation` + review/close actions are reused as-is.

### Pack approvals (from `/moderation`)
Invented to match. Columns: **PACK / AUTHOR / FORMAT / SUBMITTED / (actions)**. Actions: **Approve**, and **Reject** — which needs a reason (the API already requires one), so it expands below the row like the admin Users tab's ban form.

## Backend work (velanto-backend)

Small. The queue endpoint is bare — only `page`/`limit`:

1. `GET /packs/moderation-queue` gains **`q`** (title search), **`format`**, and **`sort`** (`oldest` default — see decision 7). Row data is already sufficient: `PublicPack` carries author summary, format and `createdAt`.
2. `GET /reports` — already has `status` + `type` + pagination, which is all the mock asks for. Add **`q`** only if we want to search reason/target text. *Optional; defer unless wanted.*
3. **`GET /moderation/counts` → `{ pendingPacks, newReports }`** so each tab can show a badge without loading the other tab's list. Two cheap `count()`s. This is what makes the panel worth having — you see at a glance where the work is.

## Frontend work (velanto-frontend)

1. Promote `DataTable` + `TablePagination` into `shared/components`; repoint the admin panel at them.
2. New `src/features/moderation/ModerationPanel.tsx` — shell, URL-driven tabs, count badges.
3. `ReportsTab` — reuse `ReportFilters`/`ReportRow` logic, re-rendered into the shared table.
4. `PackApprovalsTab` — new table + filters (search/format), Approve, and Reject-with-reason.
5. Route work: `/moderation` renders the panel; `/moderation/reports/[id]` takes over the report detail; `/support` + `/support/[id]` become redirects.
6. Header nav: collapse the two staff links into one **Moderation**.

## Risks / things that will bite

- `ModerationQueueScreen` and `SupportScreen` tests get rewritten, like the admin tabs were. Expect the same pattern: the tests assert the *old* structure and must follow the new one.
- Tailwind: any new colour must be a token, not a literal. And if a brand-new token renders as if undefined, suspect the **stale Turbopack cache** (`rm -rf .next`) before the code — that cost time on the admin PR.
- **Checked, and NOT a risk after all:**
  - *Playwright e2e* — no spec references `/support` or `/moderation`. Nothing to update there.
  - *Deep links* — notifications only link to `/users/…` and `/packs/…`, never to a report. The only in-app link to `/support/[id]` is `ReportRow` itself, so moving the detail route breaks nothing.

## Not in scope

Feedback-board triage as a tab; a bulk approve/reject; report detail redesign (its own mock exists — separate pass).
