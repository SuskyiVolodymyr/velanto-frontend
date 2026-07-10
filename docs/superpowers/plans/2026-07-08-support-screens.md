# Support Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the moderator-facing report queue (`/support`) and report detail (`/support/[id]`) screens (velanto-frontend#29's moderator half), backed by the merged reports backend (velanto-backend#56).

**Architecture:** A new `reportsClient` API wrapper + report types, a `SupportScreen` (queue, list + filters + pagination) and `SupportReportScreen` (detail, review/close/delete/ban actions) component pair under `src/features/support/`, both gated moderator+ matching `AdminScreen.tsx`'s exact access pattern. Reuses existing primitives: `LogsTab`'s pagination shape, `AuthorScreen`'s inline ban-form JSX, `BAN_DURATIONS`/`usersClient.ban()`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

**Design doc:** `docs/superpowers/specs/2026-07-08-support-screens-design.md`

---

### Task 1: Report types + `reportsClient` + `packsClient.delete()` + reason labels

**Files:**

- Create: `src/shared/types/report.ts`
- Create: `src/shared/lib/reports-client.ts`
- Create: `src/shared/lib/report-reasons.ts`
- Modify: `src/shared/lib/packs-client.ts`
- Test: `src/shared/lib/reports-client.test.ts`
- Test: `src/shared/lib/packs-client.test.ts` (check if this file exists first — if `packs-client.ts` has no existing test file, create `packs-client.test.ts` fresh rather than skipping coverage for the new `delete()` method, since API-client wrappers in this repo are consistently unit-tested — confirm by checking `src/shared/lib/users-client.test.ts`'s existence as precedent)

- [ ] **Step 1: Create the report types**

`src/shared/types/report.ts`:

```ts
/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md). Field shapes mirror
 * velanto-backend's actual shipped response shapes from PR #63.
 */
export type ReportType = "pack" | "user" | "round";
export type ReportStatus = "new" | "reviewing" | "closed";

export interface Report {
  id: string;
  type: ReportType;
  reason: string;
  comment: string | null;
  targetId: string;
  roundIndex: number | null;
  reporterId: string;
  status: ReportStatus;
  reviewedById: string | null;
  closedById: string | null;
  createdAt: string;
}

export interface ReportWithReporter extends Report {
  reporterUsername: string;
}

export interface ReportList {
  items: ReportWithReporter[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Create the reason-label map**

`src/shared/lib/report-reasons.ts`:

```ts
import type { ReportType } from "@/src/shared/types/report";

// Fixed taxonomy, not free text — mirrors velanto-backend's
// src/modules/reports/types/reasons.ts exactly (short canonical ids); this
// repo doesn't import backend types (see report.ts's file header), so the
// label text is duplicated deliberately, sourced verbatim from the design
// mocks' own REPORT_REASONS arrays (Vilante Pack.dc.html, Vilante
// Author.dc.html, Vilante Play*.dc.html).
export const REPORT_REASON_LABELS: Record<
  ReportType,
  Record<string, string>
> = {
  pack: {
    inappropriate: "Inappropriate or offensive content",
    copyright: "Copyright or ownership issue",
    spam: "Spam or misleading",
    other: "Something else",
  },
  user: {
    harassment: "Harassment or abuse",
    impersonation: "Impersonation",
    spam: "Spam or scam",
    other: "Something else",
  },
  round: {
    wrong_answer: "Wrong or mislabeled item",
    broken_media: "Image or video not loading",
    inappropriate: "Inappropriate content",
    other: "Something else",
  },
};

export function reportReasonLabel(type: ReportType, reason: string): string {
  return REPORT_REASON_LABELS[type][reason] ?? reason;
}
```

- [ ] **Step 3: Write the failing tests for `reportsClient`**

```ts
import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { reportsClient } from "@/src/shared/lib/reports-client";

vi.mock("@/src/shared/lib/api-client");
const mockedApiClient = vi.mocked(apiClient);

describe("reportsClient", () => {
  it("create() POSTs to /reports", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "r1" });
    const input = { type: "pack" as const, targetId: "p1", reason: "spam" };
    const result = await reportsClient.create(input);
    expect(mockedApiClient.post).toHaveBeenCalledWith("/reports", input);
    expect(result).toEqual({ id: "r1" });
  });

  it("list() GETs /reports with status/type/page/limit query params", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await reportsClient.list({
      status: "new",
      type: "pack",
      page: 2,
      limit: 20,
    });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/reports?status=new&type=pack&page=2&limit=20",
    );
  });

  it("list() omits query params when no filters given", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await reportsClient.list({});
    expect(mockedApiClient.get).toHaveBeenCalledWith("/reports");
  });

  it("getById() GETs /reports/:id", async () => {
    mockedApiClient.get.mockResolvedValue({ id: "r1" });
    await reportsClient.getById("r1");
    expect(mockedApiClient.get).toHaveBeenCalledWith("/reports/r1");
  });

  it("review() POSTs to /reports/:id/review", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "r1", status: "reviewing" });
    await reportsClient.review("r1");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/reports/r1/review");
  });

  it("close() POSTs to /reports/:id/close", async () => {
    mockedApiClient.post.mockResolvedValue({ id: "r1", status: "closed" });
    await reportsClient.close("r1");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/reports/r1/close");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- reports-client`
Expected: FAIL — module `@/src/shared/lib/reports-client` doesn't exist.

- [ ] **Step 5: Implement `reportsClient`**

`src/shared/lib/reports-client.ts`:

```ts
import { apiClient } from "@/src/shared/lib/api-client";
import type {
  Report,
  ReportList,
  ReportType,
  ReportWithReporter,
} from "@/src/shared/types/report";

export interface CreateReportInput {
  type: ReportType;
  targetId: string;
  roundIndex?: number;
  reason: string;
  comment?: string;
}

export interface ListReportsFilters {
  status?: "new" | "reviewing" | "closed";
  type?: ReportType;
  page?: number;
  limit?: number;
}

function buildListQuery(filters: ListReportsFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const reportsClient = {
  create: (input: CreateReportInput) =>
    apiClient.post<Report>("/reports", input),
  list: (filters: ListReportsFilters = {}) =>
    apiClient.get<ReportList>(`/reports${buildListQuery(filters)}`),
  getById: (id: string) => apiClient.get<ReportWithReporter>(`/reports/${id}`),
  review: (id: string) => apiClient.post<Report>(`/reports/${id}/review`),
  close: (id: string) => apiClient.post<Report>(`/reports/${id}/close`),
};
```

Note: `apiClient.post`'s second argument is optional (confirm this in `src/shared/lib/api-client.ts` before writing `review`/`close` with no body — every other no-body POST in this repo, e.g. `usersClient.unban`/`usersClient.follow`, already calls `apiClient.post` with only one argument, so this is an established pattern, not a new assumption).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- reports-client`
Expected: PASS.

- [ ] **Step 7: Write the failing test for `packsClient.delete()`**

Read `src/shared/lib/packs-client.ts` and check for an existing `packs-client.test.ts`. If one exists, add this case to it; if not, create it fresh with just this one test plus the minimum surrounding imports needed (don't attempt to backfill tests for `create`/`getById`/`list` — out of scope for this task):

```ts
it("delete() DELETEs /packs/:id", async () => {
  const deleteSpy = vi
    .spyOn(apiClient, "delete")
    .mockResolvedValue({ deleted: true });
  const result = await packsClient.delete("pack-1");
  expect(deleteSpy).toHaveBeenCalledWith("/packs/pack-1");
  expect(result).toEqual({ deleted: true });
});
```

First confirm `apiClient` actually exposes a `delete` method (check `src/shared/lib/api-client.ts` — if it only has `get`/`post`/`patch`, you'll need to add a `delete` method there too, following the exact same pattern as `patch`, before `packsClient.delete()` can call it).

- [ ] **Step 8: Run test to verify it fails**

Run: `npm test -- packs-client`
Expected: FAIL — `packsClient.delete` is not a function (and/or `apiClient.delete` doesn't exist yet).

- [ ] **Step 9: Add `apiClient.delete` (if missing) and `packsClient.delete()`**

If `api-client.ts` has no `delete` method, add one matching `post`'s shape but with `method: "DELETE"` and no body:

```ts
delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
```

Add to `packsClient` in `src/shared/lib/packs-client.ts`:

```ts
delete: (id: string) => apiClient.delete<{ deleted: true }>(`/packs/${id}`),
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test -- packs-client reports-client`
Expected: PASS.

- [ ] **Step 11: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 12: Commit**

```bash
git add src/shared/types/report.ts src/shared/lib/reports-client.ts src/shared/lib/report-reasons.ts src/shared/lib/packs-client.ts src/shared/lib/api-client.ts src/shared/lib/reports-client.test.ts src/shared/lib/packs-client.test.ts
git commit -m "feat: add reportsClient, report types, reason labels, packsClient.delete()"
```

---

### Task 2: `SupportScreen` — queue

**Files:**

- Create: `src/features/support/SupportScreen.tsx`
- Test: `src/features/support/SupportScreen.test.tsx`

Guard ordering follows `AdminScreen.tsx`'s exact pattern (read it in full first) — `status === "loading"` → `null`; `status === "unauthenticated"` → log-in prompt; `!allowed` (authenticated but not moderator+) → redirect via `useEffect` + `null` render; then the local fetch-loading state, SEPARATE from the auth guards (this codebase has shipped two "permanent blank screen" bugs this session from combining a local fetch-status guard with an auth-status guard in a single condition — keep them sequential and independent, matching `ProfileScreen.tsx`/`AuthorScreen.tsx`'s established fix pattern).

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupportScreen } from "./SupportScreen";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/reports-client");
vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/support",
}));

const mockedReportsClient = vi.mocked(reportsClient);
const mockedUseAuth = vi.mocked(useAuth);

const report = {
  id: "r1",
  type: "pack" as const,
  reason: "spam",
  comment: null,
  targetId: "pack-1",
  roundIndex: null,
  reporterId: "u1",
  reporterUsername: "reporter1",
  status: "new" as const,
  reviewedById: null,
  closedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockAuth(role: string | null) {
  mockedUseAuth.mockReturnValue({
    user: role
      ? { id: "mod-1", email: "m@x.com", username: "mod", role, createdAt: "" }
      : null,
    status: role ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("SupportScreen", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows a log-in prompt for an unauthenticated viewer", async () => {
    mockAuth(null);
    render(<SupportScreen />);
    await waitFor(() =>
      expect(screen.getByText(/need to be logged in/i)).toBeInTheDocument(),
    );
  });

  it("renders nothing for a plain-user viewer (redirect path)", async () => {
    mockAuth("user");
    const { container } = render(<SupportScreen />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("renders the report queue for a moderator viewer", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({
      items: [report],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<SupportScreen />);
    await waitFor(() =>
      expect(screen.getByText("reporter1")).toBeInTheDocument(),
    );
    expect(screen.getByText("Spam or misleading")).toBeInTheDocument();
  });

  it("filters by status when a status chip is clicked", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({
      items: [report],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<SupportScreen />);
    await waitFor(() =>
      expect(screen.getByText("reporter1")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "New" }));
    await waitFor(() =>
      expect(mockedReportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "new", page: 1 }),
      ),
    );
  });

  it("filters by type when a type chip is clicked", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({
      items: [report],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<SupportScreen />);
    await waitFor(() =>
      expect(screen.getByText("reporter1")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Users" }));
    await waitFor(() =>
      expect(mockedReportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "user", page: 1 }),
      ),
    );
  });

  it("loads more results and appends without duplicates", async () => {
    mockAuth("moderator");
    mockedReportsClient.list
      .mockResolvedValueOnce({ items: [report], total: 2, page: 1, limit: 1 })
      .mockResolvedValueOnce({
        items: [{ ...report, id: "r2", reporterUsername: "reporter2" }],
        total: 2,
        page: 2,
        limit: 1,
      });
    render(<SupportScreen />);
    await waitFor(() =>
      expect(screen.getByText("reporter1")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(screen.getByText("reporter2")).toBeInTheDocument(),
    );
    expect(screen.getByText("reporter1")).toBeInTheDocument();
  });

  it("shows an empty-state message when no reports match", async () => {
    mockAuth("moderator");
    mockedReportsClient.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    render(<SupportScreen />);
    await waitFor(() =>
      expect(screen.getByText(/no reports match/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- SupportScreen`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `SupportScreen.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  reportsClient,
  type ListReportsFilters,
} from "@/src/shared/lib/reports-client";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import type {
  ReportStatus,
  ReportType,
  ReportWithReporter,
} from "@/src/shared/types/report";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: ReportStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "closed", label: "Closed" },
];

const TYPE_FILTERS: { value: ReportType | undefined; label: string }[] = [
  { value: undefined, label: "All types" },
  { value: "pack", label: "Packs" },
  { value: "user", label: "Users" },
  { value: "round", label: "Rounds" },
];

const STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  new: "border-acc/30 bg-acc/10 text-acc",
  reviewing: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  closed: "border-white/10 bg-white/[0.06] text-foreground-secondary",
};

function targetLabel(report: ReportWithReporter): {
  text: string;
  href: string;
} {
  const shortId = report.targetId.slice(0, 8);
  if (report.type === "user")
    return { text: `User ${shortId}`, href: `/users/${report.targetId}` };
  if (report.type === "round") {
    return {
      text: `Round ${(report.roundIndex ?? 0) + 1} of pack ${shortId}`,
      href: `/packs/${report.targetId}`,
    };
  }
  return { text: `Pack ${shortId}`, href: `/packs/${report.targetId}` };
}

export function SupportScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(
    undefined,
  );
  const [typeFilter, setTypeFilter] = useState<ReportType | undefined>(
    undefined,
  );
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const allowed =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setStatus("loading");
    const filters: ListReportsFilters = {
      status: statusFilter,
      type: typeFilter,
      page: 1,
      limit: PAGE_SIZE,
    };
    reportsClient
      .list(filters)
      .then((result) => {
        if (cancelled) return;
        setReports(result.items);
        setTotal(result.total);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, statusFilter, typeFilter]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await reportsClient.list({
        status: statusFilter,
        type: typeFilter,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setReports((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        return [...prev, ...result.items.filter((r) => !existingIds.has(r.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view this page.
        </Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Reports
      </Text>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
              statusFilter === f.value
                ? "border-acc/40 bg-acc/10 text-acc"
                : "border-border bg-white/[0.02] text-foreground-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
              typeFilter === f.value
                ? "border-acc/40 bg-acc/10 text-acc"
                : "border-border bg-white/[0.02] text-foreground-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <Text variant="secondary">Loading reports…</Text>
      )}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load reports. Try again later.
        </Text>
      )}
      {status === "ready" && reports.length === 0 && (
        <Text variant="secondary">No reports match these filters.</Text>
      )}

      {status === "ready" && reports.length > 0 && (
        <div className="flex flex-col gap-2">
          {reports.map((report) => {
            const target = targetLabel(report);
            return (
              <Link
                key={report.id}
                href={`/support/${report.id}`}
                className="grid grid-cols-[70px_1.4fr_1.1fr_1fr_100px_110px] items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-sm hover:bg-white/[0.03]"
              >
                <span className="text-xs font-semibold uppercase text-foreground-secondary">
                  {report.type}
                </span>
                <Text className="truncate font-semibold">{target.text}</Text>
                <Text variant="secondary" className="truncate">
                  {reportReasonLabel(report.type, report.reason)}
                </Text>
                <Text variant="tertiary" className="truncate">
                  {report.reporterUsername}
                </Text>
                <Text variant="tertiary" className="text-xs">
                  {new Date(report.createdAt).toLocaleDateString()}
                </Text>
                <Badge className={STATUS_BADGE_CLASS[report.status]}>
                  {report.status.toUpperCase()}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {status === "ready" && reports.length < total && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void handleLoadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- SupportScreen`
Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/support/SupportScreen.tsx src/features/support/SupportScreen.test.tsx
git commit -m "feat: add SupportScreen report queue with status/type filters"
```

---

### Task 3: `SupportReportScreen` — detail + actions

**Files:**

- Create: `src/features/support/SupportReportScreen.tsx`
- Test: `src/features/support/SupportReportScreen.test.tsx`

Same guard-ordering discipline as Task 2. Reuses the exact inline ban-form JSX shape from `AuthorScreen.tsx` (duration select from `BAN_DURATIONS`, reason `Input`, "Confirm ban" button, `disabled={!banReason.trim()}`) — read `src/features/author/AuthorScreen.tsx` in full first to copy the shape precisely rather than approximating it.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupportReportScreen } from "./SupportReportScreen";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/reports-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/support/r1",
}));

const mockedReportsClient = vi.mocked(reportsClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedUsersClient = vi.mocked(usersClient);
const mockedUseAuth = vi.mocked(useAuth);

const packReport = {
  id: "r1",
  type: "pack" as const,
  reason: "spam",
  comment: "looks fake",
  targetId: "pack-1",
  roundIndex: null,
  reporterId: "u1",
  reporterUsername: "reporter1",
  status: "new" as const,
  reviewedById: null,
  closedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const userReport = {
  ...packReport,
  id: "r2",
  type: "user" as const,
  targetId: "user-1",
  reason: "harassment",
};

function mockAuth() {
  mockedUseAuth.mockReturnValue({
    user: {
      id: "mod-1",
      email: "m@x.com",
      username: "mod",
      role: "moderator",
      createdAt: "",
    },
    status: "authenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("SupportReportScreen", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows a not-found message when the report doesn't exist", async () => {
    mockAuth();
    mockedReportsClient.getById.mockRejectedValue(new Error("404"));
    render(<SupportReportScreen reportId="missing" />);
    await waitFor(() =>
      expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument(),
    );
  });

  it("shows Review for a new report and calls review() on click", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.review.mockResolvedValue({
      ...packReport,
      status: "reviewing",
    });
    render(<SupportReportScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Review" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() =>
      expect(mockedReportsClient.review).toHaveBeenCalledWith("r1"),
    );
  });

  it("shows Mark resolved for a new report (no review required first) and calls close()", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.close.mockResolvedValue({
      ...packReport,
      status: "closed",
    });
    render(<SupportReportScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /mark resolved/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /mark resolved/i }),
    );
    await waitFor(() =>
      expect(mockedReportsClient.close).toHaveBeenCalledWith("r1"),
    );
  });

  it("hides both queue-action buttons once a report is closed", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue({
      ...packReport,
      status: "closed",
    });
    render(<SupportReportScreen reportId="r1" />);
    await waitFor(() =>
      expect(screen.getByText("looks fake")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mark resolved/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a Delete pack button for a pack-type report and calls packsClient.delete()", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.delete.mockResolvedValue({ deleted: true });
    render(<SupportReportScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /delete pack/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /delete pack/i }));
    await waitFor(() =>
      expect(mockedPacksClient.delete).toHaveBeenCalledWith("pack-1"),
    );
    await waitFor(() =>
      expect(screen.getByText(/pack deleted/i)).toBeInTheDocument(),
    );
  });

  it("shows a Ban user button and inline ban form for a user-type report", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(userReport);
    mockedUsersClient.ban.mockResolvedValue({
      id: "user-1",
      bannedUntil: "2027-01-01T00:00:00.000Z",
    });
    render(<SupportReportScreen reportId="r2" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^ban user$/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /delete pack/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^ban user$/i }));
    await userEvent.type(
      screen.getByLabelText(/ban reason/i),
      "repeated harassment",
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(mockedUsersClient.ban).toHaveBeenCalledWith("user-1", {
        duration: "week",
        reason: "repeated harassment",
      }),
    );
  });

  it("shows an inline error and does not clear state when review() fails", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.review.mockRejectedValue(new Error("network"));
    render(<SupportReportScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Review" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- SupportReportScreen`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `SupportReportScreen.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { Badge } from "@/src/shared/components/Badge";
import type { ReportWithReporter } from "@/src/shared/types/report";

const STATUS_BADGE_CLASS: Record<string, string> = {
  new: "border-acc/30 bg-acc/10 text-acc",
  reviewing: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  closed: "border-white/10 bg-white/[0.06] text-foreground-secondary",
};

export function SupportReportScreen({ reportId }: { reportId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [report, setReport] = useState<ReportWithReporter | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showBanForm, setShowBanForm] = useState(false);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState("");
  const [banError, setBanError] = useState("");
  const [banDone, setBanDone] = useState(false);

  const allowed =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setStatus("loading");
    reportsClient
      .getById(reportId)
      .then((result) => {
        if (cancelled) return;
        setReport(result);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, reportId]);

  async function handleReview() {
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await reportsClient.review(reportId);
      setReport((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setActionError("Couldn't mark this report as reviewing. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClose() {
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await reportsClient.close(reportId);
      setReport((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setActionError("Couldn't close this report. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeletePack() {
    if (!report) return;
    setActionError("");
    try {
      await packsClient.delete(report.targetId);
      setDeleted(true);
    } catch {
      setActionError("Couldn't delete this pack. Try again.");
    }
  }

  async function handleBanSubmit() {
    if (!report || !banReason.trim()) return;
    setBanError("");
    try {
      await usersClient.ban(report.targetId, {
        duration: banDuration,
        reason: banReason.trim(),
      });
      setBanDone(true);
      setShowBanForm(false);
    } catch {
      setBanError("Couldn't ban this user. Try again.");
    }
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view this page.
        </Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  if (status === "loading") return null;

  if (status === "error" || !report) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">This report doesn&apos;t exist.</Text>
      </div>
    );
  }

  const targetHref =
    report.type === "user"
      ? `/users/${report.targetId}`
      : `/packs/${report.targetId}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-7 py-10">
      <div className="flex items-center justify-between">
        <Text as="h1" variant="title" className="text-2xl">
          {reportReasonLabel(report.type, report.reason)}
        </Text>
        <Badge className={STATUS_BADGE_CLASS[report.status]}>
          {report.status.toUpperCase()}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <Text variant="secondary">
          Reported by{" "}
          <span className="font-semibold text-foreground">
            {report.reporterUsername}
          </span>{" "}
          on {new Date(report.createdAt).toLocaleString()}
        </Text>
        <Link href={targetHref} className="text-acc hover:underline">
          View {report.type === "user" ? "reported user" : "reported pack"}
        </Link>
        {report.comment && <Text variant="secondary">{report.comment}</Text>}
      </div>

      <div className="flex flex-wrap gap-2">
        {report.status === "new" && (
          <Button disabled={actionBusy} onClick={() => void handleReview()}>
            Review
          </Button>
        )}
        {report.status !== "closed" && (
          <Button
            variant="secondary"
            disabled={actionBusy}
            onClick={() => void handleClose()}
          >
            Mark resolved
          </Button>
        )}
      </div>
      {actionError && (
        <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>
      )}

      <div className="flex flex-col gap-3 rounded-[15px] border border-red-500/20 bg-red-500/[0.03] p-5">
        <Text className="text-xs font-semibold tracking-wide text-red-400">
          MODERATION ACTIONS
        </Text>
        {(report.type === "pack" || report.type === "round") && (
          <div>
            <Button
              variant="secondary"
              disabled={deleted}
              onClick={() => void handleDeletePack()}
            >
              {deleted ? "Pack deleted ✓" : "Delete pack"}
            </Button>
          </div>
        )}
        {report.type === "user" && (
          <div>
            {!banDone && (
              <Button
                variant="secondary"
                onClick={() => setShowBanForm((v) => !v)}
              >
                Ban user
              </Button>
            )}
            {banDone && <Text variant="secondary">User banned.</Text>}
            {showBanForm && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                  Duration
                  <select
                    value={banDuration}
                    onChange={(e) =>
                      setBanDuration(e.target.value as BanDuration)
                    }
                    aria-label="Ban duration"
                    className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
                  >
                    {BAN_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason"
                  aria-label="Ban reason"
                  className="h-9 max-w-xs"
                />
                <Button
                  variant="primary"
                  disabled={!banReason.trim()}
                  onClick={() => void handleBanSubmit()}
                >
                  Confirm ban
                </Button>
                {banError && (
                  <Text className="text-xs text-[#ff6b6b]">{banError}</Text>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- SupportReportScreen`
Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/support/SupportReportScreen.tsx src/features/support/SupportReportScreen.test.tsx
git commit -m "feat: add SupportReportScreen with review/close/delete/ban actions"
```

---

### Task 4: Routing + nav entry point

**Files:**

- Create: `app/support/page.tsx`
- Create: `app/support/[id]/page.tsx`
- Modify: `src/shared/components/UserMenu.tsx`

- [ ] **Step 1: Implement the two route wrappers**

`app/support/page.tsx`:

```tsx
import { SupportScreen } from "@/src/features/support/SupportScreen";

export default function SupportPage() {
  return <SupportScreen />;
}
```

`app/support/[id]/page.tsx`:

```tsx
import { SupportReportScreen } from "@/src/features/support/SupportReportScreen";

export default async function SupportReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupportReportScreen reportId={id} />;
}
```

- [ ] **Step 2: Add a moderator+-only nav link**

Read `src/shared/components/UserMenu.tsx` in full first (it already has a client-side `role`-gated pattern to follow — check whether it renders anything conditionally on `user.role` today, e.g. an Admin link for manager+; if so, match that exact conditional-rendering shape for a new "Support" link gated on moderator+). Add a "Support" menu item, visible only when `user?.role === "moderator" || user?.role === "manager" || user?.role === "admin"`, linking to `/support`, positioned near any existing "Admin" link.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all green, including `UserMenu.test.tsx` if it exists (check whether adding a conditionally-rendered link breaks any existing snapshot/assertion there — fix forward if so, don't skip the test).

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "app/support/page.tsx" "app/support/[id]/page.tsx" src/shared/components/UserMenu.tsx
git commit -m "feat: add /support routes and moderator+ nav link"
```

---

### Task 5: Verify + review + manual test + PR + merge

- [ ] **Step 1: Full verify sequence**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all green. Re-run fresh yourself rather than trusting stale editor diagnostics.

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer`**

Review the full diff against `develop`. Fix any Critical/Important findings and re-verify (Step 1) after each fix.

- [ ] **Step 3: Manual browser verification (Claude Preview)**

Start both `backend` and `frontend` preview servers. As a moderator-role viewer, navigate to `/support`, confirm the queue renders, status/type filters narrow results, and clicking a row navigates to `/support/{id}`. On the detail screen, confirm Review/Mark resolved buttons appear correctly per status, and that Delete pack (for a pack/round report) or Ban user (for a user report) render correctly per type. If no real report exists in the dev DB yet, create one first via a direct `POST /reports` call (curl or an in-page `fetch`) using a real pack/user id, then navigate to it. As a plain user, confirm `/support` redirects away. As an anonymous viewer, confirm the log-in prompt renders.

- [ ] **Step 4: Push, open PR, merge**

Follow this repo's standing workflow and the standing autonomous-merge authorization for own-authored branches. Push, open a PR against `develop`, merge once green.

- [ ] **Step 5: Close the GitHub issue**

Do NOT close velanto-frontend#29 yet — this plan covers only the moderator-facing half (queue + detail). Leave the issue open with a comment noting the moderator UI is done and the report-submission UI (Pack/Author/Play screens) is tracked as a separate immediate follow-up, per the design spec's §6.
