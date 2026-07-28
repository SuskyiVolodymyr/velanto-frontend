# 2.0.0 — Feedback cluster redesign (slice plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Feedback cluster (`/feedback` list, `/feedback/[id]` detail) onto the same shared UI-kit vocabulary — `Card`, `Select`, `FilterChipRow`, `EmptyState` — that the four completed 2.0.0 redesigns (Admin/Moderation, Profile/Preferences, Create Pack, Solo Play/Results) already established, and close the one confirmed, code-verified author-facing gap in "pack review outcome": a pack's `rejectionReason` is fetched everywhere but rendered nowhere.

**Architecture:** No new screens, no new routes, no layout rework. `FeedbackFilters.tsx` stops hand-rolling a chip row that is byte-for-byte identical to the already-shared `FilterChipRow` component and reuses it instead. `FeedbackCard.tsx` and `FeedbackDetailScreen.tsx` swap hand-rolled `rounded-[Npx] border border-border bg-surface p-N` panels for the shared `Card` primitive (and a raw `<select>` for the shared `Select`). `FeedbackList.tsx`'s empty state swaps a bare `<Text>` for the shared `EmptyState`. A new, small `PackRejectionReason.tsx` (in `src/features/pack/`, not `src/features/feedback/`) renders a pack's `rejectionReason` to its author when the pack was rejected — the one real, backend-supported slice of "pack review outcome" this environment can build without a mock (see D2).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (semantic tokens only — `rounded-card`/`rounded-tile`/`bg-surface-card`, never a hardcoded hex or arbitrary radius), Vitest + RTL, next-intl (8 locales).

---

## 0. Scope boundary — read this first

Unlike Admin/Moderation or Profile, the Feedback cluster's **layout is already correct**: `FeedbackScreen.tsx` (list + filters + top-3 sidebar) and `FeedbackDetailScreen.tsx` (summary → body → vote → staff actions → comments, single column, `max-w-2xl`) already match the shapes the completed redesigns settled on — confirmed directly against `ReportDetailScreen.tsx` (also a single-column `max-w-2xl` "summary → content → actions" stack with no sticky sidebar; that shape isn't unique to Feedback, it's the established pattern for this kind of single-item staff-actionable screen). `/feedback` and `/feedback/[id]` also already have `generateMetadata` (`metaListTitle`/`metaListDescription` in the `feedback` catalog) — they don't have the Docs-page-plan's SEO gap.

What's real: **surface-token drift**. Every one of the four completed redesigns converged on `Card` (`rounded-card bg-surface-card border-border p-[18px]`) for panels and `bg-surface-card`/`rounded-tile` for row-style cards — confirmed independently in `PackCard.tsx` (already 2.0.0-redesigned), `PeopleTab.tsx`/`RecentlyPlayedSection.tsx` (Profile redesign), `Card.tsx` itself, and 23 other files that import `Card` directly. `FeedbackCard.tsx` and `FeedbackDetailScreen.tsx` instead hardcode `rounded-[12px]`/`rounded-[15px]` + `bg-surface` (the page-chrome token, one elevation step below `bg-surface-card` — see `app/globals.css`'s own comment: *"bar, bottom nav → --surface-card cards/panels"*). That's the gap this plan closes.

Separately: `FeedbackFilters.tsx` hand-rolls a single-select chip row (`chipClass`, `aria-pressed` buttons) that turns out to be **class-for-class identical** to `src/features/home/FilterChipRow.tsx`'s `"chip"` variant — the shared component `AuthorPackList.tsx`'s own status filter (built in the Profile/Preferences redesign, per its D13) already uses for the exact same "All / value / value / …" single-select shape. This is pure duplication to fix, not a restyle.

### DO NOT TOUCH (functionally correct, out of scope)

| Area | Files | Why |
| --- | --- | --- |
| List/detail screen shape, filter semantics, pagination, debounced search | `FeedbackScreen.tsx`, `FeedbackList.tsx` (structure), `api/feedback-list.queries.ts` | Already matches the established single-column list+detail shape (see above) |
| `/feedback`, `/feedback/[id]` metadata | `app/feedback/page.tsx`, `app/feedback/[id]/page.tsx` | Already has `generateMetadata` with real translated copy — not the Docs-page gap |
| Vote control | `FeedbackVote.tsx` | Already a thin wrapper over the shared `VoteControl` — no gap |
| Comment composer + thread styling | `FeedbackComments.tsx` | `rounded-[10px] border border-border bg-surface` for the textarea is **not stale** — it's byte-identical to Pack Detail's own still-current `CommentSection.tsx` composer (same classes, same tokens), which none of the four completed redesigns touched either. "Fixing" only the Feedback copy would create a *new* inconsistency between two comment UIs that currently agree (see D4). |
| New-post form | `NewFeedbackForm.tsx`, `app/feedback/new/page.tsx` | Not one of the three named screens for this slice — see D6 |
| `PackOwnerStatusBadge.tsx` | `src/features/pack/PackOwnerStatusBadge.tsx` | Already correct and already tested; extended by a new sibling component (Task 5), not modified |
| Moderator pack-review screen | `src/features/moderation/PackReviewScreen.tsx` + `PackReviewSidebar.tsx`/`PackReviewSummary.tsx`/`PackReviewAuthorCard.tsx`/`PackRoundMapping.tsx`/`PackContentsPreview.tsx`, `app/moderation/packs/[id]/page.tsx` | Confirmed already built (Admin/Moderation redesign) and confirmed to be a **different** screen — a moderator's approve/reject workspace (`useApprovePack`/`useRejectPack`), not an author-facing outcome view. See D2. |

### IN SCOPE

`FeedbackFilters.tsx` (dedupe onto `FilterChipRow`), `FeedbackCard.tsx` (surface tokens), `FeedbackList.tsx` (empty state), `FeedbackDetailScreen.tsx` (surface tokens + `Select`), and a new `src/features/pack/PackRejectionReason.tsx` + its wiring into `PackDetailScreen.tsx`. One new i18n key across 8 locales (`pack.rejectionReasonHeading`) — everything else reuses copy that already exists.

---

## 0b. Decision points (do NOT silently resolve these — confirm before implementing)

**D1 — No real mock access in this environment; cross-referencing the four completed redesigns stands in for it, same as the Docs-page plan's D1.**
`design/extracted/design_handoff_vilante/` does not exist on disk in this session (confirmed directly, not a worktree-isolation artifact), and there is no DesignSync-style fetch tool available. This plan leans on three things that *are* verifiable in-repo instead: (1) the shared-component vocabulary independently converged on by `Card`/`FilterChipRow`/`Select`/`EmptyState` across 23+ files in the four already-completed 2.0.0 redesigns (Admin/Moderation, Profile/Preferences, Create Pack, Solo Play/Results — all of which *did* have real mock access this same epic); (2) a direct diff of every Feedback-cluster file against those converged patterns; (3) `docs/superpowers/plans/2026-07-28-profile-preferences-redesign.md`'s own D7, which — written by an agent with real mock access — already identified the "pack review outcome" gap from the Profile mock's own `showReview` link and a `Pack Review Outcome.dc.html` mock file it did not have permission to build against, and explicitly deferred it. If a future session with real mock access finds a concrete visual mismatch this plan missed, that's new information this plan didn't have — file it separately.

**D2 — "Pack Review Outcome" is a real, distinct, author-facing gap — not a mix-up with the already-built moderator screen. Build only the mock-independent slice: the reason text itself.**
Investigated directly: `src/features/moderation/PackReviewScreen.tsx` (plus `PackReviewSidebar.tsx`/`PackReviewSummary.tsx`/`PackReviewAuthorCard.tsx`/`PackRoundMapping.tsx`/`PackContentsPreview.tsx`, routed at `app/moderation/packs/[id]/page.tsx`) is confirmed built and confirmed to be the **moderator's** approve/reject workspace — it imports `useApprovePack`/`useRejectPack` from `api/moderation.queries.ts` and is gated to `moderator`/`manager`/`admin` viewers. It has no relationship to what a pack's *author* sees after the fact. Separately, `src/features/pack/PackOwnerStatusBadge.tsx` is confirmed to be exactly what its own doc comment says: a small status pill (Draft/Pending/Rejected), author-only, nothing else. Grepping the whole frontend for `rejectionReason` turns up the field only in test fixtures and its own type declaration (`src/shared/types/pack.ts:178`) — **zero production components render it**, even though it's real, populated data: `packsClient.reject(id, reason)` (`src/shared/lib/packs-client.ts:120-121`) posts a moderator's reason to `POST /packs/:id/reject` and the response `Pack` carries it back on `rejectionReason`.

So: the mock's fuller "Pack Review Outcome" screen (implied by the Profile plan's D7 to include a `showReview` link/screen) is a real target that genuinely doesn't exist yet — but this session, like the Profile/Preferences session before it, has no mock for its actual layout, and per this project's own established discipline (Docs-page D3: *"if you notice a copy difference, STOP and flag it, don't invent it"*; Profile D7's own deferral) building a full new screen from zero source of truth would be inventing UI, not redesigning it.
→ **Build the one piece that needs no mock at all: surface the existing `rejectionReason` text to the author.** A new `PackRejectionReason.tsx` (Task 5) renders inline on the pack detail page, directly below the existing `PackOwnerStatusBadge`, using only the already-established `Card` vocabulary (heading + body text — the same shape every other "read-only info panel" in this app already uses, e.g. `FeedbackDetailScreen`'s translation-context block after Task 4). This is deliberately **not** a dedicated route, **not** a timeline, and **not** the richer "3 items need your edit" granular flow the mock's own name implies — those need a `changes_requested` pack status and per-item annotation data that (per the Admin/Moderation redesign's own D5/D7) **do not exist in either repo's backend**. Building them here would be the same unsupported invention Admin/Moderation explicitly declined for the analogous moderator-side surface. File a follow-up issue for the full mock-driven "Pack Review Outcome" screen once mock access returns; this task closes the honest, currently-buildable subset of it.

**D3 — `FeedbackFilters.tsx`'s hand-rolled chip row is a duplicate of `FilterChipRow`, not a stale pattern to restyle from scratch.**
`FeedbackFilters.tsx`'s own `chipClass` helper (`"rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors"`, active `"border-acc/30 bg-acc/10 text-acc"`, inactive `"border-border bg-white/[0.03] text-foreground-secondary"`) is character-for-character the same as `src/features/home/FilterChipRow.tsx`'s `"chip"` variant (`shape`/`active`/`inactive` constants). `FilterChipRow` is already the established single-select filter-row primitive — used by `AuthorPackList.tsx`'s pack-status filter (Profile/Preferences redesign, D13) and, per its own comment, "the format, sort and window filters" sitewide. `FeedbackFilters` independently reimplements it with the exact same visual output.
→ Task 1 replaces the three hand-rolled `.map()` chip blocks with three `<FilterChipRow>` calls. Because `FilterChipRow` renders the same `<button type="button" aria-pressed>` shape with the same visible label text, this is behavior- and accessibility-preserving — `FeedbackScreen.test.tsx`'s existing `getByRole("button", { name: "Feature" })`-style queries need **no changes**.

**D4 — `FeedbackComments.tsx`'s composer/thread styling is not touched — it matches Pack Detail's own still-current comment UI, which is itself untouched by every 2.0.0 redesign so far.**
`FeedbackComments.tsx`'s composer textarea (`rounded-[10px] border border-border bg-surface px-3.5 py-3 …`) looks, at first read, like the same `bg-surface`-instead-of-`bg-surface-card` drift as `FeedbackCard.tsx`. It is not: `src/features/pack/CommentSection.tsx` — the pack detail page's own comment thread, a completely separate feature not in scope for this plan and not touched by any of the four completed redesigns — uses the *identical* class string for its own composer textarea, and the identical `rounded-[14px] border border-border bg-surface` for its thread-card wrapper (`THREAD_CARD`). Since two independent, still-current comment UIs already agree with each other on this token combination, it reads as a deliberate (if older) convention specific to comment surfaces, not drift from the redesign's `Card`/`bg-surface-card` convention. "Fixing" only `FeedbackComments.tsx` would make it disagree with `CommentSection.tsx` instead of agreeing with `Card.tsx` — a net new inconsistency, not a fixed one.
→ No changes to `FeedbackComments.tsx`. If `CommentSection.tsx` is ever redesigned in a future slice, revisit `FeedbackComments.tsx` alongside it so the two stay in lockstep — file that as a paired follow-up if wanted, not built speculatively here.

**D5 — `FeedbackDetailScreen.tsx`'s overall layout (badges → title → meta → body → conditional info card → vote → conditional staff panel → comments, single column, `max-w-2xl`) is not a gap.**
It already matches `ReportDetailScreen.tsx`'s shape (`summary → content → actions`, also single-column `max-w-2xl`, no sticky sidebar) — confirmed by reading both files directly. There is no "old" detail-screen layout being carried over here; only the surface tokens *inside* two of its conditional panels (Task 4) are stale.

**D6 — `NewFeedbackForm.tsx` (`/feedback/new`) is explicitly out of scope, even though it shares the same anti-pattern.**
Its translation-suggestion section uses the identical `rounded-[15px] border border-border bg-white/[0.02] p-5` hand-rolled panel that Task 4 fixes on the detail screen. The task brief names three screens — Suggestions list, Suggestion Detail, Pack Review Outcome — and `/feedback/new` isn't one of them. Flagged here rather than silently fixed (scope creep) or silently ignored (an unflagged known gap): a follow-up task can apply the identical `Card` swap Task 4 does, verbatim, whenever `/feedback/new` is in scope.

---

## Task 1: `FeedbackFilters` — dedupe the hand-rolled chip row onto `FilterChipRow`

**Files:**
- Create: `src/features/feedback/FeedbackFilters.test.tsx`
- Modify: `src/features/feedback/FeedbackFilters.tsx`

- [ ] **Step 1: Write a characterization test for the current + target behavior**

This is a behavior-preserving refactor (D3) — `FilterChipRow` renders the identical DOM shape the hand-rolled buttons already produce, so there is no red/green pair here in the usual TDD sense. This test locks in the public contract (which prop callback fires with which value for which click) so the refactor in Step 3 has a safety net.

Create `src/features/feedback/FeedbackFilters.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FeedbackFilters } from "./FeedbackFilters";

function renderFilters(overrides: Partial<React.ComponentProps<typeof FeedbackFilters>> = {}) {
  const props: React.ComponentProps<typeof FeedbackFilters> = {
    searchInput: "",
    onSearchInputChange: vi.fn(),
    topic: undefined,
    onTopicChange: vi.fn(),
    statusFilter: undefined,
    onStatusChange: vi.fn(),
    sort: "new",
    ...overrides,
    onSortChange: overrides.onSortChange ?? vi.fn(),
  };
  render(<FeedbackFilters {...props} />);
  return props;
}

describe("FeedbackFilters", () => {
  it("renders 'All' as selected in both the topic and status rows by default", () => {
    renderFilters();
    const allButtons = screen.getAllByRole("button", { name: "All" });
    expect(allButtons).toHaveLength(2);
    for (const button of allButtons) {
      expect(button).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("clicking a topic chip calls onTopicChange with that topic", async () => {
    const onTopicChange = vi.fn();
    renderFilters({ onTopicChange });
    await userEvent.click(screen.getByRole("button", { name: "Feature" }));
    expect(onTopicChange).toHaveBeenCalledWith("feature");
  });

  it("clicking 'All' in the topic row after a topic is active calls onTopicChange(undefined)", async () => {
    const onTopicChange = vi.fn();
    renderFilters({ topic: "feature", onTopicChange });
    const [topicAll] = screen.getAllByRole("button", { name: "All" });
    await userEvent.click(topicAll);
    expect(onTopicChange).toHaveBeenCalledWith(undefined);
  });

  it("clicking a status chip calls onStatusChange with that status", async () => {
    const onStatusChange = vi.fn();
    renderFilters({ onStatusChange });
    await userEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(onStatusChange).toHaveBeenCalledWith("in_progress");
  });

  it("clicking a sort chip calls onSortChange directly (no 'all' sentinel to translate)", async () => {
    const onSortChange = vi.fn();
    renderFilters({ onSortChange });
    await userEvent.click(screen.getByRole("button", { name: "Top" }));
    expect(onSortChange).toHaveBeenCalledWith("top");
  });
});
```

- [ ] **Step 2: Run the test against the current implementation, confirm it PASSES**

Run: `npm test -- src/features/feedback/FeedbackFilters.test.tsx`
Expected: PASS (all 5 tests) — this is the safety net for Step 3, not a red step; the hand-rolled implementation already satisfies this contract.

- [ ] **Step 3: Replace the hand-rolled chip row with `FilterChipRow`**

Replace the full contents of `src/features/feedback/FeedbackFilters.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Input } from "@/src/shared/components/Input";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import type {
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";

// "all" is the UI sentinel for "no filter" — same convention as
// AuthorPackList's StatusChoice (Profile/Preferences redesign, D13).
type TopicChoice = "all" | FeedbackTopic;
type StatusChoice = "all" | FeedbackStatus;

const TOPIC_ORDER: FeedbackTopic[] = ["bug", "feature", "translation", "other"];
const TOPIC_LABEL_KEY: Record<FeedbackTopic, string> = {
  bug: "topicBug",
  feature: "topicFeature",
  translation: "topicTranslation",
  other: "topicOther",
};

const STATUS_ORDER: FeedbackStatus[] = [
  "new",
  "in_progress",
  "done",
  "declined",
];
// status labels live in the shared `status` ns (matches the StatusBadge labels).
const STATUS_LABEL_KEY: Record<FeedbackStatus, string> = {
  new: "feedbackNew",
  in_progress: "feedbackInProgress",
  done: "feedbackDone",
  declined: "feedbackDeclined",
};

const SORT_OPTIONS: { value: FeedbackSort; key: string }[] = [
  { value: "top", key: "sortTop" },
  { value: "new", key: "sortNewest" },
];

interface FeedbackFiltersProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  topic: FeedbackTopic | undefined;
  onTopicChange: (value: FeedbackTopic | undefined) => void;
  statusFilter: FeedbackStatus | undefined;
  onStatusChange: (value: FeedbackStatus | undefined) => void;
  sort: FeedbackSort;
  onSortChange: (value: FeedbackSort) => void;
}

export function FeedbackFilters({
  searchInput,
  onSearchInputChange,
  topic,
  onTopicChange,
  statusFilter,
  onStatusChange,
  sort,
  onSortChange,
}: FeedbackFiltersProps) {
  const t = useTranslations("feedback");
  const tStatus = useTranslations("status");

  const topicOptions: { value: TopicChoice; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...TOPIC_ORDER.map((value) => ({
      value,
      label: t(TOPIC_LABEL_KEY[value]),
    })),
  ];

  const statusOptions: { value: StatusChoice; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...STATUS_ORDER.map((value) => ({
      value,
      label: tStatus(STATUS_LABEL_KEY[value]),
    })),
  ];

  const sortOptions = SORT_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.key),
  }));

  return (
    <>
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label={t("searchAria")}
          placeholder={t("searchPlaceholder")}
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
      </div>

      <FilterChipRow<TopicChoice>
        options={topicOptions}
        value={topic ?? "all"}
        onSelect={(value) => onTopicChange(value === "all" ? undefined : value)}
      />

      <FilterChipRow<StatusChoice>
        options={statusOptions}
        value={statusFilter ?? "all"}
        onSelect={(value) =>
          onStatusChange(value === "all" ? undefined : value)
        }
      />

      <FilterChipRow<FeedbackSort>
        options={sortOptions}
        value={sort}
        onSelect={onSortChange}
      />
    </>
  );
}
```

- [ ] **Step 4: Run the new test and the existing screen test, confirm both PASS unchanged**

Run: `npm test -- src/features/feedback/FeedbackFilters.test.tsx src/features/feedback/FeedbackScreen.test.tsx`
Expected: PASS — `FeedbackScreen.test.tsx`'s `getByRole("button", { name: "Feature" })`-style queries need no edits (D3): `FilterChipRow` renders the same `<button aria-pressed>` element with the same label text.

- [ ] **Step 5: Commit**

```bash
git add src/features/feedback/FeedbackFilters.tsx src/features/feedback/FeedbackFilters.test.tsx
git commit -m "refactor(feedback): dedupe FeedbackFilters' chip row onto the shared FilterChipRow (T1)"
```

---

## Task 2: `FeedbackCard` — fix the row-card elevation token

**Files:**
- Modify: `src/features/feedback/FeedbackCard.tsx:29,45`

- [ ] **Step 1: Confirm the current wrong token**

`FeedbackCard.tsx` line 29 (compact variant) and line 45 (full variant) both use `rounded-[12px] border border-border bg-surface`. Every established row-card in the completed redesigns uses `rounded-tile` (14px, the tile-radius token) + `bg-surface-card` (the cards/panels elevation token, one step above the `bg-surface` page-chrome token) — confirmed in `PeopleTab.tsx:110` (`"rounded-tile border border-border bg-surface-card px-3"`) and `PackCard.tsx:47` (`"rounded-[18px] border border-border bg-surface-card …"`, using the larger card radius since it's a full grid card, not a compact row). `FeedbackCard`'s two variants are row-style, matching `PeopleTab`'s tile shape exactly.

- [ ] **Step 2: Fix both class strings**

In `src/features/feedback/FeedbackCard.tsx`, change line 29:

```tsx
      className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 hover:bg-white/[0.03]"
```

to:

```tsx
      className="flex items-center gap-3 rounded-tile border border-border bg-surface-card px-3 py-2.5 hover:bg-white/[0.03]"
```

And line 45:

```tsx
      className="flex items-start gap-4 rounded-[12px] border border-border bg-surface px-4 py-3 hover:bg-white/[0.03]"
```

to:

```tsx
      className="flex items-start gap-4 rounded-tile border border-border bg-surface-card px-4 py-3 hover:bg-white/[0.03]"
```

- [ ] **Step 3: Run the existing coverage that renders `FeedbackCard`**

`FeedbackCard.tsx` has no dedicated test file (checked — none exists); it's exercised indirectly via `FeedbackScreen.test.tsx` and `FeedbackDetailScreen.test.tsx`'s sidebar/list rendering, neither of which assert exact class strings (only text content and roles). No new test is added for this step — it is a pure token swap with no behavioral change, the same "verify-and-patch, no forced test for a non-behavioral class change" discipline the Admin/Moderation plan's Task 1 used.

Run: `npm test -- src/features/feedback`
Expected: PASS, unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/features/feedback/FeedbackCard.tsx
git commit -m "style(feedback): fix FeedbackCard's row surface to the established bg-surface-card/rounded-tile tokens (T2)"
```

---

## Task 3: `FeedbackList` — empty state onto the shared `EmptyState`

**Files:**
- Modify: `src/features/feedback/FeedbackList.tsx`

- [ ] **Step 1: Confirm the target component's contract**

`src/shared/components/EmptyState.tsx` takes `title` (required), plus optional `description`/`icon`/`action`. `PeopleTab.tsx:93-96` renders it with only `title` in the exact same context (an empty list of already-filtered items) this task targets — `<EmptyState title={t(kind === "followers" ? "noFollowers" : "noFollowing")} />`. Mirror that: no icon, no description, no action, just the existing `noMatches` copy.

- [ ] **Step 2: Swap the empty-state branch**

In `src/features/feedback/FeedbackList.tsx`, add the import:

```tsx
import { EmptyState } from "@/src/shared/components/EmptyState";
```

Replace:

```tsx
      {listReady && items.length === 0 && (
        <Text variant="secondary">{t("noMatches")}</Text>
      )}
```

with:

```tsx
      {listReady && items.length === 0 && <EmptyState title={t("noMatches")} />}
```

The error branch (`{error && <Text variant="danger">{t("listError")}</Text>}`) is unchanged — `EmptyState` is for "nothing here yet", not an error state, matching `ReportDetailScreen.tsx`'s own error-vs-empty split (errors stay `Text variant="danger"` everywhere in this codebase; only empty-list states use `EmptyState`).

- [ ] **Step 3: Run the existing test that covers this exact branch**

`FeedbackScreen.test.tsx`'s `"shows an empty message when there are no items"` test asserts `screen.getByText(/no feedback matches/i)` — `EmptyState` renders its `title` prop as visible text in a `<p>`, so this regex still matches the same `noMatches` copy (*"No feedback matches these filters."*) unchanged.

Run: `npm test -- src/features/feedback/FeedbackScreen.test.tsx`
Expected: PASS, unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/features/feedback/FeedbackList.tsx
git commit -m "style(feedback): use the shared EmptyState for the no-matches list state (T3)"
```

---

## Task 4: `FeedbackDetailScreen` — `Card` + `Select` for its two info panels

**Files:**
- Modify: `src/features/feedback/FeedbackDetailScreen.tsx`

- [ ] **Step 1: Confirm the target components' contracts**

`src/shared/components/Card.tsx`: a `<div>` with `rounded-card bg-surface-card border border-border p-[18px]` baked in; `className` is appended (plain `cn()` join, not tailwind-merge), so callers only pass layout classes (`flex flex-col gap-2`, etc.), never their own radius/border/bg/padding. `src/shared/components/Select.tsx`: a styled native `<select>` wrapped in a positioning `<div>`; takes `options: {value, label, disabled?}[]` (or hand-authored `children`), forwards `aria-label`/`value`/`onChange`/`disabled`/`id`/`name` to the real `<select>`, and accepts a `className` on the wrapper (`StaffTab.tsx:281` uses `className="h-10 w-auto"` for an inline select sitting beside other controls in a row — the same shape this task needs).

- [ ] **Step 2: Add the imports**

In `src/features/feedback/FeedbackDetailScreen.tsx`, replace:

```tsx
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
```

with:

```tsx
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { Card } from "@/src/shared/components/Card";
import { Select } from "@/src/shared/components/Select";
```

- [ ] **Step 3: Swap the translation-info panel onto `Card`**

Replace:

```tsx
      {post.topic === "translation" && (
        <div className="flex flex-col gap-2 rounded-[15px] border border-border bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            {t("translationHeading")}
          </Text>
```

with:

```tsx
      {post.topic === "translation" && (
        <Card className="flex flex-col gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            {t("translationHeading")}
          </Text>
```

and its closing `</div>` (the one immediately following the `translationSuggestion` block, before `<FeedbackVote …/>`) to `</Card>`. Every child inside is unchanged.

- [ ] **Step 4: Swap the staff status/delete panel onto `Card` + `Select`**

Replace:

```tsx
      {(isStaff || canDelete) && (
        <div className="flex flex-wrap items-center gap-3 rounded-[15px] border border-border bg-surface p-5">
          {isStaff && (
            <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
              {t("statusSelectLabel")}
              <select
                value={post.status}
                disabled={statusBusy}
                onChange={(e) =>
                  handleStatusChange(e.target.value as FeedbackStatus)
                }
                aria-label={t("statusSelectLabel")}
                className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground disabled:opacity-45"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {tStatus(o.key)}
                  </option>
                ))}
              </select>
            </label>
          )}
```

with:

```tsx
      {(isStaff || canDelete) && (
        <Card className="flex flex-wrap items-center gap-3">
          {isStaff && (
            <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
              {t("statusSelectLabel")}
              <Select
                value={post.status}
                disabled={statusBusy}
                onChange={(e) =>
                  handleStatusChange(e.target.value as FeedbackStatus)
                }
                aria-label={t("statusSelectLabel")}
                className="w-auto"
                options={STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: tStatus(o.key),
                }))}
              />
            </label>
          )}
```

and its closing `</div>` (after the trailing `{deleteError && (…)}` block) to `</Card>`. Everything else inside (the busy/error text, the delete `Button`) is unchanged.

- [ ] **Step 5: Run the existing detail-screen tests**

`FeedbackDetailScreen.test.tsx`'s `"shows the status select to a staff viewer…"` test uses `screen.findByLabelText("Status")` + `userEvent.selectOptions(select, "in_progress")` — `Select` still renders a real `<select>` as a descendant of the wrapping `<label>` (implicit label association doesn't require the control to be the label's *only* or *direct* child), and `aria-label={t("statusSelectLabel")}` still names it "Status", so this query and interaction are unaffected. The `"shows the translation block…"` test only asserts on text content inside the (now-`Card`) panel, also unaffected.

Run: `npm test -- src/features/feedback/FeedbackDetailScreen.test.tsx`
Expected: PASS, unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/features/feedback/FeedbackDetailScreen.tsx
git commit -m "style(feedback): move FeedbackDetailScreen's info panels onto Card + Select (T4)"
```

---

## Task 5: `PackRejectionReason` — surface a rejected pack's reason to its author

**Files:**
- Create: `src/features/pack/PackRejectionReason.tsx`
- Create: `src/features/pack/PackRejectionReason.test.tsx`
- Modify: `src/features/pack/PackDetailScreen.tsx:19,166-169`
- Modify: `src/features/pack/PackDetailScreen.test.tsx:44-46`
- Modify: `messages/en.json` (new key: `pack.rejectionReasonHeading`)

Resolves D2. Author-only, rejected-only, reason-present-only — same gating discipline as the sibling `PackOwnerStatusBadge`, deliberately kept as its own small component rather than folded into it (single responsibility; `PackOwnerStatusBadge` stays exactly as tested today).

- [ ] **Step 1: Write the failing test**

Create `src/features/pack/PackRejectionReason.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackRejectionReason } from "@/src/features/pack/PackRejectionReason";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import type { Role } from "@/src/shared/types/user";
import type { PackStatus } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

function mockSession(id: string, role: Role = "user") {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: {
      id,
      email: "a@example.com",
      username: "alice",
      role,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function mockSignedOut() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
}

function renderReason(
  status: PackStatus,
  rejectionReason: string | null,
  packAuthorId = "u1",
) {
  return render(
    <AuthProvider>
      <PackRejectionReason
        packAuthorId={packAuthorId}
        status={status}
        rejectionReason={rejectionReason}
      />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PackRejectionReason", () => {
  it("shows the reason to the pack's author when the pack was rejected", async () => {
    mockSession("u1");
    renderReason("rejected", "The cover image violates the content policy.");
    expect(
      await screen.findByText("The cover image violates the content policy."),
    ).toBeInTheDocument();
  });

  it("renders nothing when the pack isn't rejected, even with a stale reason present", async () => {
    mockSession("u1");
    const { container } = renderReason("pending", "stale reason");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when rejected but no reason was given", async () => {
    mockSession("u1");
    const { container } = renderReason("rejected", null);
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a viewer who is not the author", async () => {
    mockSession("someone-else");
    const { container } = renderReason("rejected", "reason", "u1");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a signed-out visitor", async () => {
    mockSignedOut();
    const { container } = renderReason("rejected", "reason");
    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- src/features/pack/PackRejectionReason.test.tsx`
Expected: FAIL — `src/features/pack/PackRejectionReason.tsx` doesn't exist yet.

- [ ] **Step 3: Add the new i18n key to `messages/en.json`**

In the `pack` namespace, add a new key next to `submitPackError`:

```json
    "submitPackError": "Couldn't publish this pack. Try again.",
    "rejectionReasonHeading": "Why this was rejected",
```

(Only `rejectionReasonHeading` is new; `submitPackError` is shown for anchoring, unchanged.)

- [ ] **Step 4: Implement `PackRejectionReason.tsx`**

Create `src/features/pack/PackRejectionReason.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import type { PackStatus } from "@/src/shared/types/pack";

/**
 * Surfaces WHY a pack was rejected to its author — the one piece of "pack
 * review outcome" this app can build without a mock (see
 * docs/superpowers/plans/2026-07-29-feedback-cluster-redesign-plan.md, D2).
 * `Pack.rejectionReason` is populated by a moderator's reject flow
 * (`packsClient.reject(id, reason)`, `src/features/moderation/PackReviewScreen.tsx`)
 * but was never rendered anywhere before this. Author-only, rejected-only,
 * and only when a reason was actually given — silent otherwise, same gating
 * discipline as the sibling {@link PackOwnerStatusBadge}.
 */
export function PackRejectionReason({
  packAuthorId,
  status,
  rejectionReason,
}: {
  packAuthorId: string;
  status: PackStatus;
  rejectionReason: string | null;
}) {
  const t = useTranslations("pack");
  const { user } = useAuth();
  if (
    !user ||
    user.id !== packAuthorId ||
    status !== "rejected" ||
    !rejectionReason
  ) {
    return null;
  }
  return (
    <Card className="flex flex-col gap-1.5">
      <Text
        as="h2"
        variant="tertiary"
        className="text-[12px] font-bold uppercase tracking-[0.14em]"
      >
        {t("rejectionReasonHeading")}
      </Text>
      <Text variant="secondary" className="whitespace-pre-wrap text-sm">
        {rejectionReason}
      </Text>
    </Card>
  );
}
```

- [ ] **Step 5: Run the test again, confirm it passes**

Run: `npm test -- src/features/pack/PackRejectionReason.test.tsx`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Wire it into `PackDetailScreen.tsx`**

In `src/features/pack/PackDetailScreen.tsx`, add the import next to `PackOwnerStatusBadge`'s (line 19):

```tsx
import { PackOwnerStatusBadge } from "@/src/features/pack/PackOwnerStatusBadge";
import { PackRejectionReason } from "@/src/features/pack/PackRejectionReason";
```

And render it directly after `PackOwnerStatusBadge` (around line 166-169):

```tsx
              <PackOwnerStatusBadge
                packAuthorId={pack.authorId}
                status={pack.status}
              />
              <PackRejectionReason
                packAuthorId={pack.authorId}
                status={pack.status}
                rejectionReason={pack.rejectionReason}
              />
```

- [ ] **Step 7: Update `PackDetailScreen.test.tsx`'s mock scaffolding**

`PackDetailScreen.test.tsx` already mocks `PackOwnerStatusBadge` to `() => null` (line 44-46) so the screen test doesn't need an `AuthProvider` — do the same for the new component. Add, right after that existing mock:

```tsx
vi.mock("@/src/features/pack/PackOwnerStatusBadge", () => ({
  PackOwnerStatusBadge: () => null,
}));
vi.mock("@/src/features/pack/PackRejectionReason", () => ({
  PackRejectionReason: () => null,
}));
```

- [ ] **Step 8: Run the full pack-detail suite**

Run: `npm test -- src/features/pack/PackDetailScreen.test.tsx src/features/pack/PackOwnerStatusBadge.test.tsx src/features/pack/PackRejectionReason.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/features/pack/PackRejectionReason.tsx src/features/pack/PackRejectionReason.test.tsx src/features/pack/PackDetailScreen.tsx src/features/pack/PackDetailScreen.test.tsx messages/en.json
git commit -m "feat(pack): surface a rejected pack's reason to its author (T5)"
```

---

## Task 6: i18n × 7 locales + full gates + PR

**Files:**
- Modify: `messages/{zh,hi,ar,bn,ru,ur,uk}.json`

- [ ] **Step 1: Add `pack.rejectionReasonHeading` to each of the 7 other catalogs**

Insert next to each file's existing `submitPackError` key (same position as `en.json`), short real translations — no ICU plural forms needed (no count involved):

`messages/zh.json`:
```json
    "rejectionReasonHeading": "被拒绝的原因",
```

`messages/hi.json`:
```json
    "rejectionReasonHeading": "इसे अस्वीकार क्यों किया गया",
```

`messages/ar.json`:
```json
    "rejectionReasonHeading": "سبب الرفض",
```

`messages/bn.json`:
```json
    "rejectionReasonHeading": "কেন এটি প্রত্যাখ্যান করা হয়েছে",
```

`messages/ru.json`:
```json
    "rejectionReasonHeading": "Почему пак отклонён",
```

`messages/ur.json`:
```json
    "rejectionReasonHeading": "اسے کیوں مسترد کیا گیا",
```

`messages/uk.json`:
```json
    "rejectionReasonHeading": "Чому пак відхилено",
```

- [ ] **Step 2: Run the catalog-parity test**

Run: `npm test -- catalogs`
Expected: PASS — `src/shared/types/cross-repo-drift.test.ts`'s `LOCALES` ↔ `messages/*.json` invariant confirms all 8 catalogs now carry exactly the same key set (this plan adds exactly one key, `pack.rejectionReasonHeading`; every other task reuses existing copy).

- [ ] **Step 3: Full local gates**

Run in order:
```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
Expected: all four succeed.

There is no existing `e2e/feedback.spec.ts` in this repo (checked `e2e/` — only `auth`, `home`, `create-pack`, `edit-pack`, `play`), so `npm run test:e2e` has no Feedback-specific coverage to protect and isn't a gate here — same situation the Profile/Preferences plan noted for `/profile`/`/settings` (T15). Adding one is optional net-new coverage, not required by this plan.

- [ ] **Step 4: `pr-review-toolkit:code-reviewer` on the full branch diff**

Fix any Critical/Important findings, re-review until clean. Given the scope, explicitly ask it to confirm: (a) `FeedbackComments.tsx` and `NewFeedbackForm.tsx` were not touched (D4/D6); (b) no new pack status value or per-item annotation concept was introduced anywhere (D2's hard constraint, mirroring Admin/Moderation's D5/D7); (c) `PackOwnerStatusBadge.tsx` itself was not modified, only extended by a sibling component.

- [ ] **Step 5: Open PR into `release/2.0.0`, self-merge per standing 2.0.0 authorization**

Branch off `release/2.0.0` (per the workspace root `CLAUDE.md`'s "sub-branch → PR into release/X.Y.Z" rule — self-merge up to the release branch freely, never into `develop`/`main` without asking). State all gate results (Step 3) in the PR body — no CI runs on `release/*` branches. Delete the branch after merge.

---

## Self-review

- **Spec coverage:** the task asked for a plan covering the Suggestions list, Suggestion Detail, and Pack Review Outcome (if needed) screens, matching established 2.0.0 UI-kit conventions. List (Tasks 1-3) and Detail (Task 4) are covered by real, triangulated token/component-reuse gaps; Pack Review Outcome is covered by Task 5's deliberately-scoped-down slice, with the full mock-driven screen explicitly deferred and justified (D2) rather than silently dropped or silently invented.
- **Placeholder scan:** no TBDs; every step has literal file contents, exact line anchors, and exact commands with expected output. All 7 non-English translations are real short strings, not transliterated stubs.
- **Type consistency:** `PackRejectionReason`'s props (`packAuthorId: string`, `status: PackStatus`, `rejectionReason: string | null`) match `Pack`'s actual field types in `src/shared/types/pack.ts` and the exact prop names `PackOwnerStatusBadge` already established for the same two shared fields (`packAuthorId`, `status`). `FeedbackFilters`' external prop contract (`FeedbackTopic | undefined` / `FeedbackStatus | undefined`) is unchanged by Task 1 — only its internals change, so `FeedbackScreen.tsx` (which consumes it) needs no edits anywhere in this plan.
- **Risk check:** Tasks 1-4 are deliberately structured so the *existing* test suites (`FeedbackScreen.test.tsx`, `FeedbackDetailScreen.test.tsx`) pass unmodified — every swap targets a component with a matching accessible-name/role contract to what it replaces. The only genuinely new behavior in this plan is Task 5, which ships with its own full test suite mirroring `PackOwnerStatusBadge.test.tsx`'s proven gating pattern.
