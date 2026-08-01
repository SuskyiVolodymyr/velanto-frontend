# 2.0.0 — Admin + Moderation redesign (slice plan)

Date: 2026-07-28

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

Mocks (ground truth, DesignSync project, fetched this session):

| Mock | Source | Drives |
| --- | --- | --- |
| `Admin.dc.html` | full markup, `tool-results/toolu_01TEG2E1BgnViitH9CQ6tkdN.txt` | `/admin` — Overview / Staff / Users / Logs tabs |
| `Admin User Detail.dc.html` | summarized (header comment + inline script comments), scratchpad `designsync/` | `/admin/users/[id]` |
| `Moderation.dc.html` | summarized (header comment + inline script comments), scratchpad `designsync/` | `/moderation` — Reports / Pack approvals tabs |
| `Moderation Review.dc.html` | full markup, `tool-results/toolu_01WPyGRjbs1YJyWP6qmvJ1oi.txt` | the per-report and per-pack-approval detail+action screen |

Surfaces touched: `app/admin/page.tsx`, `app/admin/users/[id]/page.tsx`,
`app/moderation/page.tsx`, `app/moderation/reports/[id]/page.tsx`, plus a
**new** `app/moderation/packs/[id]/page.tsx`.
Branch: `feature/2.0.0-admin-moderation-redesign` off `release/2.0.0` (already
created, based on `f3cf7ea`). TDD, small commits,
`pr-review-toolkit:code-reviewer` before the PR.

---

## 0. Scope boundary — read this first

**This slice is unlike every other 2.0.0 mock-patch slice so far.** Profile,
Create Pack, and Content Pages each found a real "old UI" that needed
replacing. Admin and Moderation do not: reading every screen, subcomponent,
API client, and the `velanto-backend` endpoints behind them shows the
**entire feature surface the mocks describe already exists, end to end,
including the parts other slices' mocks turned out to want but not have**
(a real audit log, real platform metrics with a 7-day chart, a real
per-user staff detail view). The literal `grid-template-columns` strings,
padding values, and colour tokens in the current components match the new
mocks' inline CSS almost verbatim in most places — e.g. `LogsTab.tsx`'s
`COLUMNS = "150px 1.1fr 150px 1fr 1.2fr"` is character-for-character the
mock's own grid. This strongly suggests these screens were already built
directly against this (or a near-identical earlier) DesignSync mock, not
against the pre-redesign design system the other slices replaced.

**Consequence for this plan:** most of it is a **verify-and-patch** pass
(confirm a tab already matches, fix only the itemized deltas below), not a
rewrite. Do not restyle a component "for consistency" if a side-by-side
check against the real mock shows no difference — that is exactly the
gold-plating this session's other slices have learned to avoid. The plan
still finds a handful of **real** gaps — a few missing interactions, one
missing screen — which get proper TDD tasks below.

### DO NOT TOUCH (functionally correct, verified against the real backend)

| Area | Files |
| --- | --- |
| Ban/unban, with the 13-category reason taxonomy | `usersClient.ban/unban` (`src/shared/lib/users-client.ts`), `BanReasonPicker` (`src/shared/components/BanReasonPicker.tsx`), `BAN_REASONS` (`src/shared/types/rules.ts`) — 12 categories + `other`, confirmed identical to the mocks' `BAN_REASONS` list and to backend `BAN_REASONS` (`velanto-backend/src/modules/rules/types/rules.ts`) |
| Trust/untrust | `usersClient.setTrusted`, wired in `UserRow.tsx` |
| Staff role grant/revoke + RBAC (admin never grantable) | `usersClient.changeRole`, `RoleSelect.tsx`, `src/shared/lib/staff-permissions.ts` (`assignableRolesFor`/`canActOn`/`outranks`); backend `PATCH /users/:id/role` in `users.controller.ts`, rank-checked in `user-moderation.service.ts::changeRole()` |
| Audit log (recording + querying) | `src/features/admin/LogsTab.tsx` + `admin.ts`/`admin.queries.ts` + `adminClient.auditLogs`; backend `AuditService` (`velanto-backend/src/modules/audit/audit.service.ts`), `@AuditAction` decorator + interceptor, `GET /admin/audit-logs` — confirmed a real `AuditLog` table, not a mock-only concept |
| Audit action taxonomy (10 codes, 5 tone groups) | `src/features/admin/audit-actions.ts` — identical action set and colour grouping to the mock's `AUDIT_ACTIONS` |
| Platform overview metrics + 7-day plays chart + top packs | `OverviewTab.tsx`, `PlaysChart.tsx`, `TopPacksToday.tsx`; backend `admin.service.ts::overview()` → `GET /admin/overview` — confirmed real (`onlineUsers` via `PresenceService`, `playsLast7Days` real 7-bucket query, `topPacksToday` real `groupBy`) |
| Report list/filter/pagination, review/close actions | `ReportsTab.tsx`, `ReportFilters.tsx`, `ReportQueueActions.tsx`, `api/reports-list.*`, `api/report-detail.mutations.ts`; backend `reports.controller.ts` |
| Pack approve/reject | `PackApprovalsTab.tsx`'s inline actions, `api/moderation.queries.ts`; backend `packs.controller.ts` `POST /packs/:id/approve`\|`/reject` |
| Delete-pack / ban-user-from-report actions | `ReportModerationPanel.tsx`, `use-report-moderation.ts` |
| `DataTable`/`DataTableRow`/`TablePagination`/`StatusBadge`/`Select`/`Input`/`Card`/`Badge` primitives | `src/shared/components/*` — already the shared 2.0.0 primitives, used consistently across every admin/moderation screen already |
| `Username` role-badge nickname-sweep treatment | `src/shared/components/Username.tsx` — same `ROLE_STYLE`/gradient tiers the mocks describe, already shared with Profile |
| `save_one_friends` correctly absent from the format filter | `PackApprovalsTab.tsx` derives its format dropdown from `PACK_FORMATS` (5, current) — the mock's own inline comment flags its own `save_one_friends` option as stale; current code already gets this right, nothing to fix |

### IN SCOPE

A lightweight diff-and-patch pass over Overview/Staff/Users/Logs/Reports/
Pack-approvals (expect small or zero deltas per tab, see Task 1); one real
missing interaction on Staff (3-way add-staff resolver); one real missing
interaction on Admin User Detail (no trust/ban actions today); a small
header role-badge addition; and the one genuine missing screen — a
per-pack review detail page — plus wiring the report detail screen to show
the actual reported content inline, both of which reuse only endpoints
that already exist and are already staff-permissioned.

---

## Decision points (do NOT silently resolve these — confirm before implementing)

**D1 — Treat this as verify-and-patch, not rewrite (see §0).** Every task
below that touches an already-built tab starts with an explicit
side-by-side check against the mock's inline CSS/copy before writing any
change. If a check finds no delta, the task's diff is empty — that is a
valid, expected outcome, not a sign the task was skipped.

**D2 — Header ADMIN/STAFF role-badge pill is missing; add it locally, not
globally.** Both mocks show a small pill next to the page's breadcrumb —
purple "ADMIN" (`Admin.dc.html`) or a cyan/pink "STAFF" tag
(`Moderation.dc.html`) — using the same `ROLE_STYLE` token family
`Username` already renders. Today `AdminScreen.tsx`'s and
`ModerationPanel.tsx`'s own header sections (the `panelEyebrow` + heading
block each screen renders itself) have no such pill. There is no shared
site-wide `Header.tsx` component carrying page-specific breadcrumbs — the
global nav is generic across the whole app — so this is not a nav change.
→ Add the pill directly inside `AdminScreen.tsx`'s and
`ModerationPanel.tsx`'s own header block (T4), reusing the existing role
badge colour tokens (`Username`'s `ROLE_STYLE`/`IDENTITY_PILL`, not a new
derivation).

**D3 — `AdminUserDetailScreen` has no Trust/Ban actions; add them,
reusing the exact pattern already proven twice elsewhere.** The mock's
Admin User Detail hero has Trust/Untrust and Ban/Unban buttons with the
same inline ban form (duration chips + `BanReasonPicker` + confirm/cancel)
used on the admin Users tab (`UserRow.tsx`/`UserBanForm.tsx`) and on the
public author page's staff-only panel (`AuthorModeratorPanel.tsx`/
`use-author-moderation.ts`). Today `AdminUserDetailScreen.tsx` is
read-only: stats, ban history, pack rails, a link out to the public
profile — no action buttons. This is a real gap, not a restyle, but a
*small* one: it is the third instance of an interaction this codebase
already implements identically twice, so reuse `usersClient.ban`/
`usersClient.setTrusted` and the same duration-chip/reason-picker/confirm
shape rather than inventing a fourth variant.
→ Add Trust/Ban actions to the hero (T3), modeled directly on
`AuthorModeratorPanel.tsx` + `use-author-moderation.ts` (a hook +
presentational split is the established pattern here — mirror it with a
new `use-admin-user-moderation.ts`, don't inline the state into the
screen).

**D4 — Staff-tab "+ Add staff" currently accepts only an exact email;
upgrade to the mock's 3-way resolver using endpoints that already exist.**
The mock accepts an email, an `@username`, or a raw user id, showing a
kind badge (`EMAIL`/`USERNAME`/`USER ID`) and — for username/id — a
disambiguating matches dropdown (never trust the top hit of a substring
search). Today `StaffTab.tsx` only takes an email, resolved via
`adminClient.listUsers({ q: email })` + an exact-match filter. Checked
`admin.service.ts::listUsers()` on the backend (`velanto-backend`): its
`q` filter is `OR: [{ username: contains }, { email: contains }]` —
**no id matching**. So a raw-id input cannot go through the search
endpoint. It doesn't need to: `adminClient.userDetail(id)` (`GET
/admin/users/:id`) already exists and already does an exact, unambiguous
id lookup — `AdminUserDetailScreen` uses it today.
→ Build the 3-way resolver client-side only (T2): an email-looking input
still resolves via `listUsers({q})` + exact-match; a `@`-prefixed or
bare-word input resolves via `listUsers({q})` and shows a matches
dropdown when there's more than one hit (mirroring the mock's
`addMatches`/`showMatches`/`noMatch` states); an id-shaped input (mirror
the mock's own `/^[0-9a-f]{6,}$/i`-style heuristic, adjusted to this
app's actual id format — check `AdminUserRow.id`'s real shape before
porting the mock's regex verbatim) resolves via `adminClient.userDetail(id)`
directly, no dropdown needed since it's already exact. No backend change.

**D5 — Cut the mock's "Request changes" / per-item "mark for edit" /
`changes_requested` pack status / "AWAITING AUTHOR" badge. Confirmed no
backend support, in both repos.** `Moderation Review.dc.html`'s approval
mode lets a moderator mark individual items, pack fields (title/
description/cover/tags), and round titles for edit, write a note, and send
the pack to a `Changes requested` status the author can resubmit from — and
`Moderation.dc.html`'s pack-approvals table shows an `awaitingAuthor` badge
implying the same state. Checked `src/shared/types/pack.ts`:
`PACK_STATUSES = ["draft", "pending", "approved", "rejected"]` — no fifth
state. This is one of this repo's MIRRORED cross-repo constants
(`cross-repo-drift.test.ts`), and its backend counterpart
`PACK_MODERATION_STATUSES` (`velanto-backend/src/modules/packs/types/
moderation-status.ts`) is the same four values. Building the granular
mark-for-edit UI without a status to put the pack into, or a way for the
author to see "here's what to fix," is new product surface (a new status,
a migration, author-facing notification/resubmission flow), not a redesign.
→ **Do not build it.** Keep the existing two-action model: Approve, or
Reject with a required reason (`PackApprovalsTab.tsx`'s current inline
reject flow already covers "tell the author what's wrong," just without
per-item granularity). No `awaitingAuthor` badge anywhere (T7/T8). File a
follow-up issue for the backend-first work if it's wanted later.

**D6 — Build the missing pack-review detail screen — this is the one
real new screen in this plan.** `PackApprovalsTab.tsx` today does
inline-row Approve/Reject only; there is no `/moderation/packs/[id]`
route, unlike reports which already have `/moderation/reports/[id]` →
`ReportDetailScreen.tsx`. `Moderation Review.dc.html`'s approval mode
wants a full per-pack screen: cover, title/description/tags/format/
language, author card with stats, every pool's items, every round and
which pool it draws from, then Approve/Reject in a sticky sidebar. This is
pure frontend work over data that's already fetchable and already
permissioned: `packsClient.getById(id)` hits `GET /packs/:id`, which is
explicitly documented in `velanto-backend/src/modules/packs/
packs.controller.ts` (line 128–130) as visible to "its own author or a
moderator+ viewer" for a non-approved pack — confirmed by reading the
controller. The existing `useApprovePack`/`useRejectPack` mutations
(`api/moderation.queries.ts`) work unchanged from a detail screen.
→ Build `app/moderation/packs/[id]/page.tsx` → a new
`PackReviewScreen.tsx` (T8), reusing `packsClient.getById` +
`useApprovePack`/`useRejectPack`. `PackApprovalsTab.tsx` keeps its inline
quick Approve/Reject **and** gets each row linking to the new screen (the
mock does both — row actions use `stopPropagation` so they don't also
trigger the row's open-review-screen click; T8 wires this the same way
`PackApprovalsTab.tsx`'s reject-form toggle already avoids navigating).

**D7 — Cut the granular "Pack history" timeline and per-item annotation
sidebar from the new pack-review screen — same backend gap as D5.** The
mock's approval-mode sidebar includes a draft→submitted→
changes-requested→published event timeline and a "mark item, write
request, send to author" panel. Beyond the fields already on `Pack`
(`createdAt`, `submittedAt`, current `status`), there is no backend event
log keyed to a single pack (the *admin-wide* Logs tab is a different,
already-correctly-scoped thing — T1/T8 do not try to make it double as a
per-pack timeline).
→ The new pack-review screen (T8) shows only what's directly on the
fetched `Pack`: submitted-at, author, format/language/tags, full pool/item
contents, round→pool mapping, Approve/Reject. No mark-for-edit, no
timeline.

**D8 — `ReportDetailScreen` doesn't render the reported content inline;
add it, reusing D6's renderer.** Today `ReportDetailSummary.tsx` shows
only a text reason + a `<Link>` out to the target (`reportTargetLabel`) —
a moderator has to leave the report to see what was actually reported.
`Moderation Review.dc.html`'s report modes (`round`/`pack`/`user`) render
the actual content inline: a reported round's items as cards, a reported
pack's full pools/items (same rendering as the approval mode, D6), or a
reported account's summary. This needs new data-fetching (the report
alone doesn't carry the target's content, only its id), but every fetch it
needs already exists and is already staff-safe:
`packsClient.getById(report.targetId)` for `type: "pack"` and
`type: "round"` reports (the `Report` type already carries
`roundIndex: number | null` per `src/shared/types/report.ts`, so a round
report can index into the fetched pack's `rounds[roundIndex]`); and
`adminClient.userDetail(report.targetId)` for `type: "user"` reports
(already staff-role-gated the same as this screen, already returns the
account summary + moderation counts `AdminUserDetailScreen` uses).
→ Add inline content preview to `ReportDetailScreen.tsx` (T9): extract
the pool/item-card rendering built for T8 into a shared
`PackContentsPreview.tsx` (T7) so both screens use one component, not two
near-duplicates. For a `round` report, pass a `roundIndex` filter prop
that narrows the shared renderer to one round's slots instead of every
pool. For a `user` report, render a compact summary card from
`adminClient.userDetail`, not a new fetch shape.

**D9 — Cut "Recent reports against this account" as an itemized list on a
user-type report. Confirmed no backend filter for it.** The mock's `user`
mode shows a scrollable list of other reports filed against the same
account (reason/reporter/date/status per row). Checked
`velanto-backend/src/modules/reports/dto/list-reports.dto.ts`
(`ListReportsQueryDto`): filters are `status`, `type`, and pagination only
— **no `targetId`**. There is no way to ask "every report filed against
user X" from the current `GET /reports` endpoint.
→ **Do not build the itemized list.** `AdminUserDetail` (already fetched
via D8's `adminClient.userDetail` reuse) already carries the aggregate
`moderation.reportsAgainst`/`reportsFiled` counts — show those two numbers
on the user-report summary card instead of trying to itemize. File a
follow-up issue if a `targetId` filter is wanted later (small, isolated
backend change — add the field to the DTO + a `where` clause — but that's
a `velanto-backend` PR, out of scope here).

**D10 — A random-slot round report can't show "exactly what was played";
say so instead of pretending otherwise.** `Slot.mode === "random"` draws
`count` items fresh each play (`src/shared/types/pack.ts`) — there is no
per-play snapshot of which items a specific playthrough actually drew, so
a round report referencing a random slot cannot reproduce the exact play.
The mock's own hardcoded example sidesteps this by only showing a
`manual · all 4 shown` round. This is a genuine, permanent modeling limit
(not a redesign gap) that the previous slices' D-notes call out the same
way for similar cases.
→ In the shared `PackContentsPreview` (T7/T9), a `random` slot renders
every item currently in its pool with a "drawn randomly · N items in this
pool" note, not a claim of exact reproduction. A `manual` slot renders
its pinned `itemIds` in order, which *is* exactly what was shown (per the
domain model, manual slots are pinned and static).

---

## Mock reference — extracted spec

**Admin — Overview tab.** 6 metric tiles
(`grid-template-columns:repeat(auto-fit,minmax(160px,1fr))`, gap 14px):
registered users, packs, plays, online users (green live-dot), pending
reports, storage (`usedBytes` of `ceilingBytes`) — `OverviewTab.tsx`
already renders exactly these 6 in this order. 7-day plays bar chart
(`1.3fr` column) + top-5 packs-today list (`1fr` column), gap 16px —
`PlaysChart.tsx`/`TopPacksToday.tsx` already split this way. **Expect
near-zero diff** (T1).

**Admin — Staff tab.** Add-staff bar (email/username/id input + kind
badge + matches dropdown + role select + button, D4) + search box + a
5-column table (Member/Role/Added by/Since/Remove) — table shape already
matches (`StaffTab.tsx` `COLUMNS`), the add-staff bar is the real delta
(T2).

**Admin — Users tab.** Search + 3 selects (staff filter / banned filter /
sort) + a 7-column table (User/Role/Packs/Plays/Registered/Status/
actions) with an inline expand-under-row ban form — `UsersTab.tsx`/
`UserRow.tsx`/`UserBanForm.tsx` already match this shape and the exact
column template string. One small delta: the mock's inline ban form pairs
"Confirm ban" with an explicit "Cancel" button; `UserBanForm.tsx` today
has only Confirm (closing the form requires re-clicking the row's Ban
toggle). Add a Cancel button calling the same toggle-closed path (T3, this
one line item is real, everything else on this tab is confirm-only).

**Admin — Logs tab.** Search + action-filter select + from/to date
inputs + sort toggle + a 5-column table (Time/Actor/Action/Target/
Details) + Prev/Next pagination — `LogsTab.tsx`'s `COLUMNS` string,
`AUDIT_ACTIONS` taxonomy, and `TablePagination`'s Prev/Next shape are
already character-for-character matches to the mock. **Expect zero diff**
(T1).

**Admin User Detail.** Hero: avatar-initials tile, `@username` + role/
trust badge (`Username showRole`, already correct), email, registered
date, "View public profile →" link, Active/Banned pill, **Trust/Untrust +
Ban/Unban buttons with the shared inline ban form (D3, the real gap)**.
Below: 5 stat sections (Content/Activity/Storage/Social/Moderation) — all
already rendered by `AdminUserDetailScreen.tsx` reading the same field
names the mock uses (`content.packsTotal`, `storage.usedBytes`, etc.).
Ban-history list — already rendered via `useAuthorBanHistory`. Created-
packs + recently-played rails — already rendered via `AuthorPacksRail`/
`RecentlyPlayedSection`, staff-bypass-privacy note already honoured
(`visible` prop unconditionally true here). **Only the action buttons are
new** (T3).

**Moderation panel.** Reports/Packs tabs with live badge counts
(`useModerationCounts`) — already matches. **STAFF header pill missing**
(D2/T4).

**Moderation — Reports tab.** Status chips (All/New/Reviewing/Closed) +
type chips (All/Packs/Users/Rounds) + a 6-column table (Type/Target/
Reason/Reporter/Date/Status), paginated — `ReportsTab.tsx`/
`ReportFilters.tsx` already match. **Expect near-zero diff** (T5).

**Moderation — Pack approvals tab.** Search + format select (5 real
formats, `save_one_friends` correctly absent, see DO NOT TOUCH) + sort
toggle + a table (Pack/Author/Format/Submitted/actions) with inline
Approve + expandable Reject-reason form — already matches. **Real deltas:**
no `awaitingAuthor` badge (cut, D5); rows don't link to a detail screen
yet (new, D6/T8).

**Moderation Review — report modes (`round`/`pack`/`user`/`closed`).**
Sticky header (Back-to-queue, type+id crumb, contextual action buttons) +
a mode switcher (used for the design demo's internal state, **not** a
real UI control here — this app already routes reports and pack-approvals
to *separate* URLs, so no mode-switcher chrome is needed, just the
content-per-type rendering, D8). Left column: report summary card (type
tag, status pill, reporter+date, reason heading, target link, reporter's
comment) — already `ReportDetailSummary.tsx`. **New:** below the summary,
the actual reported content — a round's item cards, a pack's full pool/
item breakdown, or a reported account's summary + aggregate report/ban
counts (D8/D9/D10). Right column: existing `ReportQueueActions.tsx`
(Review/Mark resolved) + existing `ReportModerationPanel.tsx`
(delete-pack / ban-user forms) — unchanged.

**Moderation Review — approval mode.** Same sticky header pattern. Left
column: pending badge + submitted-by line + pack summary sentence, then
cover/title/description/tags/format/language, author card with stats,
then every pool (collapsible, open-by-default per D5/D7's cut of the
mark-for-edit affordance — no need to default-collapse for triage since
there's nothing to triage per-item here), then round→pool mapping. Right
column: Approve / Reject-with-reason (mirroring `PackApprovalsTab`'s
existing reject flow, moved into a sidebar) — **no** Request-changes
button, **no** per-item mark-for-edit, **no** pack-history timeline (D5/D7
cuts).

**Token mapping.** Every screen here already reads Tailwind semantic
tokens (`bg-surface`, `border-border`, `text-foreground-tertiary`,
`bg-acc`, `text-danger`) rather than hardcoded hex — confirmed by reading
every file in this plan. No new token work expected; if a genuinely new
literal shows up while implementing (e.g. the violet/amber "PRIVILEGE"/
"TRIAGE" audit-action tones, which are already `text-violet-300`/
`text-amber-300` Tailwind palette colours, not custom hex), match the
existing convention in `audit-actions.ts` rather than inventing a new one.

---

## Task list

Each task = one commit. Tests first (TDD) in every task that names a test
file. Run `npm test -- <touched test files>` at the end of each task
before committing, not just at the very end.

### Task 1: Diff-and-patch — Overview, Logs, Staff table, Users table, Reports, Pack-approvals

**Files:** `src/features/admin/OverviewTab.test.tsx`, `LogsTab.test.tsx`,
`StaffTab.test.tsx`, `UsersTab.test.tsx`,
`src/features/moderation/ReportsTab.test.tsx`,
`PackApprovalsTab.test.tsx` (existing tests — read each first)

- [ ] **Step 1:** For each of the six screens above, open the relevant mock
  section and the current component side by side. Record concrete deltas
  only (a literal CSS value, a missing/extra element, a copy mismatch) —
  do not restyle anything that already matches. Per §0/D1, expect this
  list to be short or empty for most of these six.
- [ ] **Step 2:** Patch only the recorded deltas. Known ones going in:
  none confirmed yet beyond what Tasks 2–8 already cover — if this step
  turns up something substantive, it likely belongs in its own commit
  rather than folded silently into this one; use judgement.
- [ ] **Step 3:** Run and update existing tests for any touched file.
- [ ] **Step 4:** Commit (only if Step 2 found real deltas — an empty diff
  is a valid outcome, see §0; do not force a commit).
  `git commit -m "style(admin,moderation): patch verified mock deltas across list screens (T1)"`

### Task 2: Staff tab — 3-way "+ Add staff" resolver (email / username / id)

**Files:**
- Modify: `src/features/admin/StaffTab.tsx`, `StaffTab.test.tsx`
- Read first (do not modify): `src/shared/lib/admin-client.ts` (`listUsers`,
  `userDetail`), `src/shared/types/admin.ts` (`AdminUserRow.id` shape)

- [ ] **Step 1: Write failing tests** for the 3-way resolver: an
  email-shaped input resolves via `listUsers({q})` + exact-match (existing
  behaviour, keep its test); a bare/`@`-prefixed input shows a matches
  dropdown when `listUsers({q})` returns >1 hit, and resolves directly
  when it returns exactly 1; an id-shaped input calls `userDetail(id)`
  directly and resolves with no dropdown, or shows a "no user with that
  id" state on 404.
- [ ] **Step 2: Add input-kind detection.** Port the mock's
  email/id/username heuristic (`addKind` in the mock's script), but
  verify `AdminUserRow.id`'s actual format first (check a live fixture or
  the backend's id generation — cuid/uuid/etc.) and adjust the id regex
  to match reality rather than porting the mock's `[0-9a-f]{6,}` blindly
  if the real ids don't look like that.
- [ ] **Step 3: Add the matches dropdown + kind badge**, styled per the
  mock (`EMAIL`/`USERNAME`/`USER ID` pill + a picker list of
  avatar-initials/username/email/id rows), reusing `Username`/existing
  avatar-initials treatment if one already exists in this file's imports
  (check before adding a new one).
  New i18n keys (namespace `admin`): `addStaffKindEmail`,
  `addStaffKindUsername`, `addStaffKindUserId`, `addStaffNoMatchEmail`,
  `addStaffNoMatchOther` (or similar — match this file's existing
  `noUserEmailError` naming convention).
- [ ] **Step 4: Wire resolution into the existing `addStaff` mutation** —
  it already takes a resolved `{id, role}` pair once picked; the new code
  only changes how that pair gets resolved, not the mutation itself.
- [ ] **Step 5: Run `StaffTab.test.tsx`, fix, commit.**
  `git commit -m "feat(admin): resolve add-staff input by email, username, or user id (T2)" -- src/features/admin/StaffTab.tsx src/features/admin/StaffTab.test.tsx messages/en.json`

### Task 3: Admin User Detail — Trust/Ban actions + Cancel button on the shared ban form

**Files:**
- New: `src/features/admin/use-admin-user-moderation.ts`,
  `use-admin-user-moderation.test.ts` (mirror
  `use-author-moderation.ts`/`.test.ts` structurally)
- Modify: `src/features/admin/AdminUserDetailScreen.tsx`,
  `AdminUserDetailScreen.test.tsx`
- Modify: `src/features/admin/UserBanForm.tsx` (add Cancel button — small,
  shared component also used by `UserRow.tsx`, check that call site still
  works after the change)

- [ ] **Step 1: Write failing tests** for `use-admin-user-moderation.ts`
  (mirror `use-author-moderation.test.ts`'s cases: toggle-ban-form,
  submit-ban success/error, trust/untrust success/error) and for the
  screen rendering Trust/Ban buttons + the inline form when banFormOpen.
- [ ] **Step 2: Build `use-admin-user-moderation.ts`** — same shape as
  `use-author-moderation.ts` but also owns `setTrusted` (author's version
  only handles ban, since only staff visit that page and trust isn't
  shown there the same way); reuse `usersClient.ban`/`usersClient.
  setTrusted` directly, `BanReasonPicker`'s `isBanReasonValid`/
  `buildBanReasonPayload` helpers, and invalidate
  `["admin-user-detail", userId]` on success (this screen's own query
  key from `adminUserDetailQueryOptions`) so the hero's Active/Banned
  pill and trust badge update without a manual reload.
- [ ] **Step 3: Add Trust/Untrust + Ban/Unban buttons to the hero**,
  positioned per the mock (next to the Active/Banned pill), opening the
  same inline duration-chips + `BanReasonPicker` + Confirm/Cancel form
  used elsewhere (this task's Cancel-button addition to `UserBanForm.tsx`
  applies here too — reuse the component, don't fork it).
  New i18n keys (namespace `admin`, reuse `ban` namespace's existing
  `confirm`/`duration`/etc. where possible): none expected beyond
  `cancel` if `common.cancel` doesn't already fit (check first).
- [ ] **Step 4: Add the Cancel button to `UserBanForm.tsx`**, calling a
  new `onCancel` prop; update both call sites (`UserRow.tsx`'s existing
  usage, this task's new usage) to pass it — `UserRow.tsx`'s existing
  `toggleBanForm(id)` already closes the form, so its `onCancel` is just
  that same handler.
- [ ] **Step 5: Run tests, commit.**
  `git commit -m "feat(admin): add trust/ban actions to the user detail screen (T3)" -- src/features/admin/use-admin-user-moderation.ts src/features/admin/use-admin-user-moderation.test.ts src/features/admin/AdminUserDetailScreen.tsx src/features/admin/AdminUserDetailScreen.test.tsx src/features/admin/UserBanForm.tsx src/features/admin/UserRow.tsx messages/en.json`

### Task 4: Header role-badge pill on Admin + Moderation screens

**Files:**
- Modify: `src/features/admin/AdminScreen.tsx`, `AdminScreen.test.tsx`
- Modify: `src/features/moderation/ModerationPanel.tsx`,
  `ModerationPanel.test.tsx`

- [ ] **Step 1: Write failing tests** asserting an "ADMIN" pill renders in
  `AdminScreen`'s header for an admin viewer (mock only shows it for
  admin, not manager — verify against the mock's `ROLE_STYLE.admin`
  entry and `actorRole()` before deciding whether a manager viewer also
  gets a pill, likely their own "MANAGER" tier per the same `ROLE_STYLE`
  map) and a "STAFF" (or role-specific) pill in `ModerationPanel`'s header
  for a moderator/manager/admin viewer.
- [ ] **Step 2: Add the pill** to each screen's existing header block
  (next to the `panelEyebrow`/heading, per the mock), reusing
  `Username`'s `ROLE_STYLE`/`IDENTITY_PILL` colour tokens — do not
  re-derive a new colour map (D2).
- [ ] **Step 3: Run tests, commit.**
  `git commit -m "style(admin,moderation): add role badge to panel headers per mock (T4)" -- src/features/admin/AdminScreen.tsx src/features/admin/AdminScreen.test.tsx src/features/moderation/ModerationPanel.tsx src/features/moderation/ModerationPanel.test.tsx`

### Task 5: Shared `PackContentsPreview` component

**Files:**
- New: `src/features/moderation/PackContentsPreview.tsx`,
  `PackContentsPreview.test.tsx`

- [ ] **Step 1: Write failing tests** covering: renders every pool with
  its items (text/youtube/image type icons, per-type thumbnail treatment
  — check if an existing item-thumbnail renderer exists anywhere in
  `src/features/create/*` for pool/item display and reuse its icon/type
  logic rather than reinventing it); a `roundIndex` prop narrows
  rendering to that round's slots only, resolving each slot's pool by
  `groupId` and rendering either the slot's pinned `itemIds` (manual) or
  every item in the pool with a "drawn randomly · N items" note (random,
  per D10); no `roundIndex` prop renders every pool (approval-mode use);
  an item-type/text search filter (mirrors the mock's `itemQuery`/
  `typeChips`, safe client-side filtering over already-fetched pack data,
  same category as Profile plan's D13, not D9).
- [ ] **Step 2: Build the component** taking a `Pack` (from
  `packsClient.getById`) plus an optional `roundIndex: number`. Random
  vs. manual slot rendering per D10. Search/type-filter UI per the mock's
  `Moderation Review.dc.html` approval-mode item grid.
- [ ] **Step 3: Run tests, commit.**
  `git commit -m "feat(moderation): add shared pack contents preview component (T5)" -- src/features/moderation/PackContentsPreview.tsx src/features/moderation/PackContentsPreview.test.tsx messages/en.json`

### Task 6: New pack-review screen — `/moderation/packs/[id]`

**Files:**
- New: `app/moderation/packs/[id]/page.tsx`
- New: `src/features/moderation/PackReviewScreen.tsx`,
  `PackReviewScreen.test.tsx`
- Modify: `src/features/moderation/PackApprovalsTab.tsx`,
  `PackApprovalsTab.test.tsx` (row now links to the new screen; keep
  inline Approve/Reject with `stopPropagation`, per D6)

- [ ] **Step 1: Write failing tests for `PackReviewScreen`** — role gate
  (moderator/manager/admin, mirror `ReportDetailScreen`'s gate exactly),
  loading/error states, renders pack summary (title/author/format/
  language/tags/description), author card with stats, `PackContentsPreview`
  (no `roundIndex`) for full pool/item contents, round→pool mapping list,
  sticky sidebar Approve button + Reject-with-reason form (reuse
  `useApprovePack`/`useRejectPack` from `api/moderation.queries.ts`
  unchanged), redirects/refetches the pack-approvals queue on success
  (mirror `PackApprovalsTab`'s existing invalidation).
- [ ] **Step 2: Build `PackReviewScreen.tsx`**, structurally mirroring
  `ReportDetailScreen.tsx` (thin orchestrator: fetch pack via
  `packsClient.getById`, render summary + `PackContentsPreview` +
  sidebar actions). No mark-for-edit, no timeline (D5/D7 cuts).
- [ ] **Step 3: Add `app/moderation/packs/[id]/page.tsx`** — thin Server
  Component wrapper, matching `app/moderation/reports/[id]/page.tsx`'s
  shape exactly (params handling, any metadata).
- [ ] **Step 4: Wire `PackApprovalsTab.tsx` rows to link to the new
  route** (`Link href={`/moderation/packs/${pack.id}`}`), keeping the
  existing inline Approve/Reject buttons with `stopPropagation` so they
  don't also navigate — same non-navigating-button-inside-a-linked-row
  pattern the mock itself calls out.
- [ ] **Step 5: Run tests, commit.**
  `git commit -m "feat(moderation): add per-pack review screen with full contents (T6)" -- app/moderation/packs/[id]/page.tsx src/features/moderation/PackReviewScreen.tsx src/features/moderation/PackReviewScreen.test.tsx src/features/moderation/PackApprovalsTab.tsx src/features/moderation/PackApprovalsTab.test.tsx messages/en.json`

### Task 7: ReportDetailScreen — inline reported-content preview

**Files:**
- Modify: `src/features/moderation/ReportDetailScreen.tsx`,
  `ReportDetailScreen.test.tsx`
- New: `src/features/moderation/ReportedUserSummary.tsx`,
  `ReportedUserSummary.test.tsx`

- [ ] **Step 1: Write failing tests** — for `type: "pack"` and
  `type: "round"` reports, `ReportDetailScreen` fetches the target pack
  (`packsClient.getById(report.targetId)`) and renders
  `PackContentsPreview`, passing `roundIndex: report.roundIndex ??
  undefined` for round reports; for `type: "user"` reports, it fetches
  `adminClient.userDetail(report.targetId)` and renders
  `ReportedUserSummary` (username, joined date, packs/comments counts,
  `moderation.reportsAgainst`/`reportsFiled` aggregate counts per D9 —
  no itemized list); loading/error states for the new fetch don't block
  the existing summary/actions from rendering (degrade gracefully, the
  content preview is additive, not blocking).
- [ ] **Step 2: Build `ReportedUserSummary.tsx`** — small presentational
  component, the account-card half of the mock's `user` mode minus the
  cut itemized reports list (D9).
- [ ] **Step 3: Wire the new fetch + conditional rendering into
  `ReportDetailScreen.tsx`**, below `ReportDetailSummary` and above
  `ReportQueueActions` (per the mock's layout — content, then actions).
- [ ] **Step 4: Run tests, commit.**
  `git commit -m "feat(moderation): show the reported content inline on the report detail screen (T7)" -- src/features/moderation/ReportDetailScreen.tsx src/features/moderation/ReportDetailScreen.test.tsx src/features/moderation/ReportedUserSummary.tsx src/features/moderation/ReportedUserSummary.test.tsx messages/en.json`

### Task 8: i18n × 8 locales + e2e + full gates + PR

**Files:**
- Modify: `messages/{uk,ru,ar,ur,hi,bn,zh}.json`
- Modify: relevant e2e specs (Grep for `admin`, `moderation` spec files)
  if any selectors break

- [ ] **Step 1: Translate every new UI-chrome key from Tasks 2–7** into
  all 7 non-English locales — this is a small key set (add-staff resolver
  labels, cancel button if new, pack-review screen chrome, reported-
  content-preview labels), not a re-translation of anything existing.
- [ ] **Step 2: `npm run test -- catalogs`**
- [ ] **Step 3: Fix any e2e selectors broken by the new pack-review route
  or the report-detail screen's new content block.**
  `npm run test:e2e -- admin moderation` (adjust to actual spec file
  names/patterns — Grep `e2e/` for `admin`/`moderation` first, there may
  be none yet given this is a staff-only surface; if so, note that
  clearly rather than assuming coverage exists).
- [ ] **Step 4: Full local gates.**
  `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] **Step 5: `pr-review-toolkit:code-reviewer` on the full branch
  diff.** Fix any Critical/Important findings, re-review until clean.
  Explicitly ask it to confirm: (a) no `changes_requested`/`awaitingAuthor`
  concept was introduced anywhere (D5/D7 — the one hard constraint this
  plan cannot violate), (b) the new pack-review screen and report-content
  preview only call endpoints that already existed before this branch.
- [ ] **Step 6: Open PR into `release/2.0.0`, self-merge per standing
  2.0.0 authorization.** State all gate results in the PR body (no CI
  runs on `release/*`). Delete the branch after merge.
