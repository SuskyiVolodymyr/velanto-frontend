# Admin Panel Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin` screen (Overview/Staff/Users/Logs tabs), gated to `admin`/`manager` roles, consuming the four backend endpoints shipped in velanto-backend#45-48. Closes velanto-frontend#50 (and its parent #30).

**Architecture:** Three new API-client modules (`admin-client.ts` for read endpoints, `users-client.ts` for ban/unban/role-change) plus two pure helper modules (`staff-permissions.ts` for client-side role-action gating, `ban-display.ts` for ban-status formatting) sit under `src/shared/lib/`. Four tab components (`OverviewTab`, `StaffTab`, `UsersTab`, `LogsTab`) plus the composing `AdminScreen` sit under `src/features/admin/`, following the same structure as `src/features/settings/`. A new `/admin` route renders `AdminScreen`, and `UserMenu` gains a conditional "Admin" link.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

---

## Reference: existing conventions this plan follows

- Data fetching: typed client modules in `src/shared/lib/*-client.ts`, each wrapping `apiClient` (`src/shared/lib/api-client.ts`). See `packs-client.ts` / `comments-client.ts`.
- Pagination envelope: `{ items, total, page, limit }`, query built via manual `URLSearchParams` in a fixed field order (see `comments-client.ts:buildListQuery`).
- Search-with-debounce: `HomeFeed.tsx` — local `searchInput` state, a 300ms `setTimeout` effect that commits to a `query` state, which is the actual effect dependency.
- "Load more" pagination: `CommentSection.tsx` — dedupes by id when appending a fetched page to avoid double-rendering ǹrows shifted by concurrent inserts.
- Auth gating in a screen component: `CreatePackForm.tsx` — `status === "loading"` → render `null`; `status === "unauthenticated"` → render a login prompt with a `router.push("/auth")` button.
- Role type: `Role = "user" | "moderator" | "admin" | "manager"`, already defined in `src/shared/types/user.ts`. Frontend does NOT import backend types (separate repos, deliberate — see `.claude/docs/coding-conventions.md`), so role-rank logic is redeclared here.
- Primitives used throughout: `Card`, `Badge`, `Button` (`variant: "primary" | "secondary" | "ghost"`), `Text` (`variant: "title" | "body" | "secondary" | "tertiary"`), `Input`, `cn`.

---

### Task 1: Types + pure permission/display helpers (TDD)

**Files:**

- Create: `src/shared/types/admin.ts`
- Create: `src/shared/lib/staff-permissions.ts`
- Create: `src/shared/lib/staff-permissions.test.ts`
- Create: `src/shared/lib/ban-display.ts`
- Create: `src/shared/lib/ban-display.test.ts`

- [ ] **Step 1: Write `src/shared/types/admin.ts`**

```ts
import type { Role } from "@/src/shared/types/user";

export interface AdminOverview {
  registeredUsers: number;
  packs: number;
  plays: number;
  onlineUsers: null;
  pendingReports: null;
}

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  bannedUntil: string | null;
}

export interface AdminUserList {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  target: string;
  meta: unknown;
  createdAt: string;
}

export interface AuditLogList {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Write the failing test for `staff-permissions.ts`**

```ts
// src/shared/lib/staff-permissions.test.ts
import { describe, expect, it } from "vitest";
import { canActOn, assignableRolesFor } from "./staff-permissions";

describe("canActOn", () => {
  it("admin can act on manager, moderator, and user", () => {
    expect(canActOn("admin", "manager")).toBe(true);
    expect(canActOn("admin", "moderator")).toBe(true);
    expect(canActOn("admin", "user")).toBe(true);
  });

  it("admin cannot act on another admin (equal rank never outranks)", () => {
    expect(canActOn("admin", "admin")).toBe(false);
  });

  it("manager can act on moderator and user, but not manager or admin", () => {
    expect(canActOn("manager", "moderator")).toBe(true);
    expect(canActOn("manager", "user")).toBe(true);
    expect(canActOn("manager", "manager")).toBe(false);
    expect(canActOn("manager", "admin")).toBe(false);
  });
});

describe("assignableRolesFor", () => {
  it("admin acting on a moderator can assign user, moderator, or manager", () => {
    expect(assignableRolesFor("admin", "moderator")).toEqual([
      "user",
      "moderator",
      "manager",
    ]);
  });

  it("manager acting on a moderator can only assign user or moderator", () => {
    expect(assignableRolesFor("manager", "moderator")).toEqual([
      "user",
      "moderator",
    ]);
  });

  it("manager acting on a manager gets no options (cannot act on equal rank)", () => {
    expect(assignableRolesFor("manager", "manager")).toEqual([]);
  });

  it("admin acting on an admin gets no options", () => {
    expect(assignableRolesFor("admin", "admin")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- staff-permissions`
Expected: FAIL with "Cannot find module './staff-permissions'"

- [ ] **Step 4: Write `src/shared/lib/staff-permissions.ts`**

```ts
import type { Role } from "@/src/shared/types/user";

const ROLE_RANK: Record<Role, number> = {
  user: 0,
  moderator: 1,
  manager: 2,
  admin: 3,
};

/**
 * Mirrors the shape of velanto-backend's own outranks() check, but this copy
 * is UX-only — it only decides which buttons render. The backend
 * re-validates every request regardless of what the client shows.
 */
function outranks(actor: Role, target: Role): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

export type AssignableRole = "user" | "moderator" | "manager";

// 'admin' is deliberately excluded — it can never be granted through any
// endpoint, only via direct database/terminal access.
const ASSIGNABLE_ROLES: AssignableRole[] = ["user", "moderator", "manager"];

export function canActOn(actorRole: Role, targetRole: Role): boolean {
  return outranks(actorRole, targetRole);
}

export function assignableRolesFor(
  actorRole: Role,
  targetRole: Role,
): AssignableRole[] {
  if (!outranks(actorRole, targetRole)) return [];
  return ASSIGNABLE_ROLES.filter((role) => outranks(actorRole, role));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- staff-permissions`
Expected: PASS (8 tests)

- [ ] **Step 6: Write the failing test for `ban-display.ts`**

```ts
// src/shared/lib/ban-display.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { formatBanStatus } from "./ban-display";

describe("formatBanStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Not banned' for null", () => {
    expect(formatBanStatus(null)).toBe("Not banned");
  });

  it("returns 'Not banned' for a bannedUntil already in the past", () => {
    expect(formatBanStatus("2020-01-01T00:00:00.000Z")).toBe("Not banned");
  });

  it("returns a formatted date for a near-future ban", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const until = "2026-01-08T00:00:00.000Z";
    expect(formatBanStatus(until)).toBe(
      `Banned until ${new Date(until).toLocaleDateString()}`,
    );
  });

  it("returns 'Permanently banned' for a ban more than 20 years out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    expect(formatBanStatus("2126-01-01T00:00:00.000Z")).toBe(
      "Permanently banned",
    );
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- ban-display`
Expected: FAIL with "Cannot find module './ban-display'"

- [ ] **Step 8: Write `src/shared/lib/ban-display.ts`**

```ts
// Matches velanto-backend's isPermanentBan threshold (ban.ts): anything more
// than ~20 years out is treated as permanent for display purposes.
const PERMANENT_THRESHOLD_MS = 20 * 365 * 24 * 60 * 60 * 1000;

export function formatBanStatus(bannedUntil: string | null): string {
  if (!bannedUntil) return "Not banned";
  const remainingMs = new Date(bannedUntil).getTime() - Date.now();
  if (remainingMs <= 0) return "Not banned";
  if (remainingMs > PERMANENT_THRESHOLD_MS) return "Permanently banned";
  return `Banned until ${new Date(bannedUntil).toLocaleDateString()}`;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- ban-display`
Expected: PASS (4 tests)

- [ ] **Step 10: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 11: Commit**

```bash
git add src/shared/types/admin.ts src/shared/lib/staff-permissions.ts src/shared/lib/staff-permissions.test.ts src/shared/lib/ban-display.ts src/shared/lib/ban-display.test.ts
git commit -m "feat: add admin types and staff-permission/ban-display helpers"
```

---

### Task 2: `admin-client.ts` (TDD)

**Files:**

- Create: `src/shared/lib/admin-client.ts`
- Create: `src/shared/lib/admin-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/admin-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import type {
  AdminOverview,
  AdminUserList,
  AuditLogList,
} from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adminClient", () => {
  it("overview() fetches /admin/overview with no params", async () => {
    const overview: AdminOverview = {
      registeredUsers: 10,
      packs: 5,
      plays: 20,
      onlineUsers: null,
      pendingReports: null,
    };
    vi.mocked(apiClient.get).mockResolvedValue(overview);

    const result = await adminClient.overview();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/overview");
    expect(result).toEqual(overview);
  });

  it("listUsers() fetches with no params when filters are empty", async () => {
    const envelope: AdminUserList = { items: [], total: 0, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    await adminClient.listUsers();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users");
  });

  it("listUsers() forwards q, page, and limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 20,
    });

    await adminClient.listUsers({ q: "alice", page: 2, limit: 20 });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/users?q=alice&page=2&limit=20",
    );
  });

  it("auditLogs() fetches with no params when filters are empty", async () => {
    const envelope: AuditLogList = { items: [], total: 0, page: 1, limit: 20 };
    vi.mocked(apiClient.get).mockResolvedValue(envelope);

    await adminClient.auditLogs();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs");
  });

  it("auditLogs() forwards actor, action, target, page, and limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await adminClient.auditLogs({
      actor: "u1",
      action: "ban_user",
      target: "u2",
      page: 1,
      limit: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/audit-logs?actor=u1&action=ban_user&target=u2&page=1&limit=20",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- admin-client`
Expected: FAIL with "Cannot find module './admin-client'"

- [ ] **Step 3: Write `src/shared/lib/admin-client.ts`**

```ts
import { apiClient } from "@/src/shared/lib/api-client";
import type {
  AdminOverview,
  AdminUserList,
  AuditLogList,
} from "@/src/shared/types/admin";

export interface ListAdminUsersFilters {
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsFilters {
  actor?: string;
  action?: string;
  target?: string;
  page?: number;
  limit?: number;
}

function buildUsersQuery(filters: ListAdminUsersFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildAuditQuery(filters: ListAuditLogsFilters): string {
  const params = new URLSearchParams();
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.action) params.set("action", filters.action);
  if (filters.target) params.set("target", filters.target);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const adminClient = {
  overview: () => apiClient.get<AdminOverview>("/admin/overview"),
  listUsers: (filters: ListAdminUsersFilters = {}) =>
    apiClient.get<AdminUserList>(`/admin/users${buildUsersQuery(filters)}`),
  auditLogs: (filters: ListAuditLogsFilters = {}) =>
    apiClient.get<AuditLogList>(`/admin/audit-logs${buildAuditQuery(filters)}`),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- admin-client`
Expected: PASS (5 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/admin-client.ts src/shared/lib/admin-client.test.ts
git commit -m "feat: add adminClient for overview/users/audit-logs read endpoints"
```

---

### Task 3: `users-client.ts` (TDD)

**Files:**

- Create: `src/shared/lib/users-client.ts`
- Create: `src/shared/lib/users-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/users-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { usersClient } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usersClient", () => {
  it("ban() posts duration and reason to /users/:id/ban", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: "u2",
      bannedUntil: "2026-01-08T00:00:00.000Z",
    });

    const result = await usersClient.ban("u2", {
      duration: "week",
      reason: "spamming",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/ban", {
      duration: "week",
      reason: "spamming",
    });
    expect(result).toEqual({
      id: "u2",
      bannedUntil: "2026-01-08T00:00:00.000Z",
    });
  });

  it("unban() posts to /users/:id/unban with no body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: "u2",
      bannedUntil: null,
    });

    const result = await usersClient.unban("u2");

    expect(apiClient.post).toHaveBeenCalledWith("/users/u2/unban");
    expect(result).toEqual({ id: "u2", bannedUntil: null });
  });

  it("changeRole() patches the role to /users/:id/role", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      id: "u2",
      role: "moderator",
    });

    const result = await usersClient.changeRole("u2", "moderator");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/u2/role", {
      role: "moderator",
    });
    expect(result).toEqual({ id: "u2", role: "moderator" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- users-client`
Expected: FAIL with "Cannot find module './users-client'"

- [ ] **Step 3: Write `src/shared/lib/users-client.ts`**

```ts
import { apiClient } from "@/src/shared/lib/api-client";
import type { AssignableRole } from "@/src/shared/lib/staff-permissions";

export type BanDuration = "week" | "month" | "year" | "forever";

export interface BanUserInput {
  duration: BanDuration;
  reason: string;
}

export interface BanResult {
  id: string;
  bannedUntil: string;
}

export interface UnbanResult {
  id: string;
  bannedUntil: null;
}

export interface ChangeRoleResult {
  id: string;
  role: AssignableRole;
}

export const usersClient = {
  ban: (id: string, input: BanUserInput) =>
    apiClient.post<BanResult>(`/users/${id}/ban`, input),
  unban: (id: string) => apiClient.post<UnbanResult>(`/users/${id}/unban`),
  changeRole: (id: string, role: AssignableRole) =>
    apiClient.patch<ChangeRoleResult>(`/users/${id}/role`, { role }),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- users-client`
Expected: PASS (3 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/users-client.ts src/shared/lib/users-client.test.ts
git commit -m "feat: add usersClient for ban/unban/role-change endpoints"
```

---

### Task 4: `OverviewTab` component (TDD)

**Files:**

- Create: `src/features/admin/OverviewTab.tsx`
- Create: `src/features/admin/OverviewTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/admin/OverviewTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewTab } from "./OverviewTab";
import { adminClient } from "@/src/shared/lib/admin-client";

vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { overview: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OverviewTab", () => {
  it("shows a loading state before the fetch resolves", () => {
    vi.mocked(adminClient.overview).mockReturnValue(new Promise(() => {}));
    render(<OverviewTab />);
    expect(screen.getByText("Loading overview…")).toBeInTheDocument();
  });

  it("renders counts and dashes for null metrics", async () => {
    vi.mocked(adminClient.overview).mockResolvedValue({
      registeredUsers: 42,
      packs: 7,
      plays: 130,
      onlineUsers: null,
      pendingReports: null,
    });

    render(<OverviewTab />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    // onlineUsers and pendingReports both render as "—", so two matches.
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("shows an error message when the fetch rejects", async () => {
    vi.mocked(adminClient.overview).mockRejectedValue(
      new Error("network error"),
    );
    render(<OverviewTab />);
    expect(
      await screen.findByText(/Couldn't load overview/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- OverviewTab`
Expected: FAIL with "Cannot find module './OverviewTab'"

- [ ] **Step 3: Write `src/features/admin/OverviewTab.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { AdminOverview } from "@/src/shared/types/admin";

const STATS: { key: keyof AdminOverview; label: string }[] = [
  { key: "registeredUsers", label: "Registered users" },
  { key: "packs", label: "Packs" },
  { key: "plays", label: "Plays" },
  { key: "onlineUsers", label: "Online users" },
  { key: "pendingReports", label: "Pending reports" },
];

export function OverviewTab() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    adminClient
      .overview()
      .then((result) => {
        if (cancelled) return;
        setOverview(result);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading")
    return <Text variant="secondary">Loading overview…</Text>;
  if (status === "error" || !overview) {
    return (
      <Text className="text-[#ff6b6b]">
        Couldn&apos;t load overview. Try again later.
      </Text>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {STATS.map(({ key, label }) => {
        const value = overview[key];
        return (
          <Card key={key} className="hover:translate-y-0 hover:shadow-none">
            <Text
              variant="tertiary"
              className="text-xs uppercase tracking-wide"
            >
              {label}
            </Text>
            <Text as="p" variant="title" className="mt-2 text-2xl">
              {value === null ? "—" : value}
            </Text>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- OverviewTab`
Expected: PASS (3 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/OverviewTab.tsx src/features/admin/OverviewTab.test.tsx
git commit -m "feat: add OverviewTab admin component"
```

---

### Task 5: `UsersTab` component — search + ban/unban (TDD)

**Files:**

- Create: `src/features/admin/UsersTab.tsx`
- Create: `src/features/admin/UsersTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/admin/UsersTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersTab } from "./UsersTab";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient } from "@/src/shared/lib/users-client";
import type { User } from "@/src/shared/types/user";
import type { AdminUserRow } from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { listUsers: vi.fn() },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { ban: vi.fn(), unban: vi.fn() },
}));

const ADMIN: User = {
  id: "admin1",
  email: "admin@example.com",
  username: "admin1",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const TARGET: AdminUserRow = {
  id: "u2",
  username: "bob",
  email: "bob@example.com",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  bannedUntil: null,
};

function renderAsAdmin() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: ADMIN,
  });
  return render(
    <AuthProvider>
      <UsersTab />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsersTab", () => {
  it("fetches page 1 and renders matching users", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsAdmin();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(adminClient.listUsers).toHaveBeenCalledWith({
      q: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("bans a user after picking a duration and entering a reason", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    // A week out from "now" — computed relative to the real clock (not a
    // hardcoded date) so this assertion can't go stale as time passes.
    const bannedUntil = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    vi.mocked(usersClient.ban).mockResolvedValue({ id: "u2", bannedUntil });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Ban" }));
    await user.type(screen.getByLabelText("Ban reason"), "spamming");
    await user.click(screen.getByRole("button", { name: "Confirm ban" }));

    await waitFor(() =>
      expect(usersClient.ban).toHaveBeenCalledWith("u2", {
        duration: "week",
        reason: "spamming",
      }),
    );
    expect(
      await screen.findByText(
        `Banned until ${new Date(bannedUntil).toLocaleDateString()}`,
      ),
    ).toBeInTheDocument();
  });

  it("does not show a Ban button for a target the actor cannot act on (equal rank)", async () => {
    const peerAdmin: AdminUserRow = {
      ...TARGET,
      id: "u3",
      username: "peer",
      role: "admin",
    };
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [peerAdmin],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsAdmin();

    await screen.findByText("peer");
    expect(
      screen.queryByRole("button", { name: "Ban" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- UsersTab`
Expected: FAIL with "Cannot find module './UsersTab'"

- [ ] **Step 3: Write `src/features/admin/UsersTab.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { useAuth } from "@/src/shared/lib/auth-context";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import { canActOn } from "@/src/shared/lib/staff-permissions";
import { formatBanStatus } from "@/src/shared/lib/ban-display";
import type { AdminUserRow } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const BAN_DURATIONS: { value: BanDuration; label: string }[] = [
  { value: "week", label: "1 week" },
  { value: "month", label: "1 month" },
  { value: "year", label: "1 year" },
  { value: "forever", label: "Forever" },
];

function isCurrentlyBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now();
}

export function UsersTab() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    adminClient
      .listUsers({ q: query || undefined, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.items);
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
  }, [query]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await adminClient.listUsers({
        q: query || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        return [...prev, ...result.items.filter((u) => !existingIds.has(u.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch {
      setActionError("Couldn't load more users. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleBan(id: string) {
    if (!banReason.trim()) return;
    setActionError("");
    try {
      const result = await usersClient.ban(id, {
        duration: banDuration,
        reason: banReason.trim(),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, bannedUntil: result.bannedUntil } : u,
        ),
      );
      setBanTargetId(null);
      setBanReason("");
    } catch {
      setActionError("Couldn't ban this user. Try again.");
    }
  }

  async function handleUnban(id: string) {
    setActionError("");
    try {
      await usersClient.unban(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, bannedUntil: null } : u)),
      );
    } catch {
      setActionError("Couldn't unban this user. Try again.");
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search users"
          placeholder="Search by username or email…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && <Text variant="secondary">Loading users…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load users. Try again later.
        </Text>
      )}
      {status === "ready" && users.length === 0 && (
        <Text variant="secondary">No users match this search.</Text>
      )}

      {status === "ready" && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((row) => {
            const banned = isCurrentlyBanned(row.bannedUntil);
            const canAct = canActOn(user.role, row.role);
            return (
              <div
                key={row.id}
                className="rounded-[15px] border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Text className="font-semibold">{row.username}</Text>
                    <Text variant="tertiary" className="text-xs">
                      {row.email} · <Badge>{row.role}</Badge>
                    </Text>
                    <Text variant="secondary" className="text-xs">
                      {formatBanStatus(row.bannedUntil)}
                    </Text>
                  </div>
                  {canAct && (
                    <div className="flex gap-2">
                      {banned ? (
                        <Button
                          variant="secondary"
                          onClick={() => void handleUnban(row.id)}
                        >
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setBanTargetId(
                              banTargetId === row.id ? null : row.id,
                            )
                          }
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {banTargetId === row.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                    <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                      Duration
                      <select
                        value={banDuration}
                        onChange={(e) =>
                          setBanDuration(e.target.value as BanDuration)
                        }
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
                      onClick={() => void handleBan(row.id)}
                    >
                      Confirm ban
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {actionError && (
        <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>
      )}

      {status === "ready" && users.length < total && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void handleLoadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- UsersTab`
Expected: PASS (3 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/UsersTab.tsx src/features/admin/UsersTab.test.tsx
git commit -m "feat: add UsersTab admin component with search and ban/unban"
```

---

### Task 6: `StaffTab` component — search + role change (TDD)

**Files:**

- Create: `src/features/admin/StaffTab.tsx`
- Create: `src/features/admin/StaffTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/admin/StaffTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTab } from "./StaffTab";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient } from "@/src/shared/lib/users-client";
import type { User } from "@/src/shared/types/user";
import type { AdminUserRow } from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { listUsers: vi.fn() },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { changeRole: vi.fn() },
}));

const MANAGER: User = {
  id: "m1",
  email: "manager@example.com",
  username: "manager1",
  role: "manager",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const TARGET: AdminUserRow = {
  id: "u2",
  username: "bob",
  email: "bob@example.com",
  role: "moderator",
  createdAt: "2026-01-01T00:00:00.000Z",
  bannedUntil: null,
};

function renderAsManager() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: MANAGER,
  });
  return render(
    <AuthProvider>
      <StaffTab />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StaffTab", () => {
  it("fetches page 1 and renders matching users with a role select", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsManager();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByLabelText("Change role for bob")).toBeInTheDocument();
  });

  it("does not offer 'manager' as an option for a manager actor (cannot grant own rank)", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsManager();

    await screen.findByText("bob");
    const select = screen.getByLabelText("Change role for bob");
    const optionValues = Array.from(select.querySelectorAll("option")).map(
      (o) => o.getAttribute("value"),
    );
    expect(optionValues).not.toContain("manager");
  });

  it("changes a user's role via the select", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    vi.mocked(usersClient.changeRole).mockResolvedValue({
      id: "u2",
      role: "user",
    });
    const user = userEvent.setup();
    renderAsManager();

    await screen.findByText("bob");
    await user.selectOptions(
      screen.getByLabelText("Change role for bob"),
      "user",
    );

    await waitFor(() =>
      expect(usersClient.changeRole).toHaveBeenCalledWith("u2", "user"),
    );
  });

  it("hides the role select for a target the actor cannot act on", async () => {
    const peerManager: AdminUserRow = {
      ...TARGET,
      id: "u3",
      username: "peer",
      role: "manager",
    };
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [peerManager],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsManager();

    await screen.findByText("peer");
    expect(
      screen.queryByLabelText("Change role for peer"),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- StaffTab`
Expected: FAIL with "Cannot find module './StaffTab'"

- [ ] **Step 3: Write `src/features/admin/StaffTab.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { useAuth } from "@/src/shared/lib/auth-context";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient } from "@/src/shared/lib/users-client";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/src/shared/lib/staff-permissions";
import type { AdminUserRow } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function StaffTab() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    adminClient
      .listUsers({ q: query || undefined, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.items);
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
  }, [query]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await adminClient.listUsers({
        q: query || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        return [...prev, ...result.items.filter((u) => !existingIds.has(u.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch {
      setActionError("Couldn't load more users. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleRoleChange(id: string, role: AssignableRole) {
    setActionError("");
    try {
      const result = await usersClient.changeRole(id, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: result.role } : u)),
      );
    } catch {
      setActionError("Couldn't change this user's role. Try again.");
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search staff"
          placeholder="Search by username or email…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && <Text variant="secondary">Loading users…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load users. Try again later.
        </Text>
      )}
      {status === "ready" && users.length === 0 && (
        <Text variant="secondary">No users match this search.</Text>
      )}

      {status === "ready" && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((row) => {
            const options = assignableRolesFor(user.role, row.role).filter(
              (role) => role !== row.role,
            );
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-border bg-surface p-4"
              >
                <div>
                  <Text className="font-semibold">{row.username}</Text>
                  <Text variant="tertiary" className="text-xs">
                    {row.email} · <Badge>{row.role}</Badge>
                  </Text>
                </div>
                {options.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const role = e.target.value as AssignableRole;
                      e.target.value = "";
                      void handleRoleChange(row.id, role);
                    }}
                    aria-label={`Change role for ${row.username}`}
                    className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
                  >
                    <option value="" disabled>
                      Change role…
                    </option>
                    {options.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {actionError && (
        <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>
      )}

      {status === "ready" && users.length < total && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void handleLoadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- StaffTab`
Expected: PASS (4 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/StaffTab.tsx src/features/admin/StaffTab.test.tsx
git commit -m "feat: add StaffTab admin component with hierarchy-gated role changes"
```

---

### Task 7: `LogsTab` component — filters + paginated audit log (TDD)

**Files:**

- Create: `src/features/admin/LogsTab.tsx`
- Create: `src/features/admin/LogsTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/admin/LogsTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogsTab } from "./LogsTab";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { AuditLogEntry } from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { auditLogs: vi.fn() },
}));

const LOG: AuditLogEntry = {
  id: "l1",
  actorId: "a1",
  actorUsername: "admin1",
  action: "ban_user",
  target: "u2",
  meta: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LogsTab", () => {
  it("fetches page 1 with no filters and renders log rows", async () => {
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [LOG],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<LogsTab />);

    expect(await screen.findByText(/admin1/)).toBeInTheDocument();
    expect(screen.getByText(/ban_user/)).toBeInTheDocument();
    expect(adminClient.auditLogs).toHaveBeenCalledWith({
      actor: undefined,
      action: undefined,
      target: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("re-fetches with an action filter after debounce", async () => {
    vi.useFakeTimers();
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const user = userEvent.setup({ delay: null });
    render(<LogsTab />);

    await user.type(screen.getByLabelText("Filter by action"), "ban_user");
    vi.advanceTimersByTime(300);

    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        actor: undefined,
        action: "ban_user",
        target: undefined,
        page: 1,
        limit: 20,
      }),
    );
    vi.useRealTimers();
  });

  it("shows an empty state when no logs match", async () => {
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    render(<LogsTab />);
    expect(
      await screen.findByText("No audit log entries match these filters."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LogsTab`
Expected: FAIL with "Cannot find module './LogsTab'"

- [ ] **Step 3: Write `src/features/admin/LogsTab.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { AuditLogEntry } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const FILTER_DEBOUNCE_MS = 300;

interface Filters {
  actor: string;
  action: string;
  target: string;
}

export function LogsTab() {
  const [actorInput, setActorInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [filters, setFilters] = useState<Filters>({
    actor: "",
    action: "",
    target: "",
  });
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setFilters({
          actor: actorInput.trim(),
          action: actionInput.trim(),
          target: targetInput.trim(),
        }),
      FILTER_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [actorInput, actionInput, targetInput]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    adminClient
      .auditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        target: filters.target || undefined,
        page: 1,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        if (cancelled) return;
        setLogs(result.items);
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
  }, [filters]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await adminClient.auditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        target: filters.target || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        return [...prev, ...result.items.filter((l) => !existingIds.has(l.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Filter by actor"
          placeholder="Actor ID"
          value={actorInput}
          onChange={(e) => setActorInput(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          aria-label="Filter by action"
          placeholder="Action"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          aria-label="Filter by target"
          placeholder="Target"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          className="max-w-[200px]"
        />
      </div>

      {status === "loading" && <Text variant="secondary">Loading logs…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load logs. Try again later.
        </Text>
      )}
      {status === "ready" && logs.length === 0 && (
        <Text variant="secondary">
          No audit log entries match these filters.
        </Text>
      )}

      {status === "ready" && logs.length > 0 && (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-[12px] border border-border bg-surface p-3 text-sm"
            >
              <Text variant="tertiary" className="text-xs">
                {new Date(log.createdAt).toLocaleString()}
              </Text>
              <Text>
                <span className="font-semibold">{log.actorUsername}</span> ·{" "}
                {log.action} ·{" "}
                <span className="text-foreground-secondary">{log.target}</span>
              </Text>
            </div>
          ))}
        </div>
      )}

      {status === "ready" && logs.length < total && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void handleLoadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LogsTab`
Expected: PASS (3 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/LogsTab.tsx src/features/admin/LogsTab.test.tsx
git commit -m "feat: add LogsTab admin component with filterable audit log"
```

---

### Task 8: `AdminScreen` component — tab switcher + role gate (TDD)

**Files:**

- Create: `src/features/admin/AdminScreen.tsx`
- Create: `src/features/admin/AdminScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/admin/AdminScreen.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminScreen } from "./AdminScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { User } from "@/src/shared/types/user";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { overview: vi.fn(), listUsers: vi.fn(), auditLogs: vi.fn() },
}));

const MANAGER: User = {
  id: "m1",
  email: "manager@example.com",
  username: "manager1",
  role: "manager",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const PLAIN_USER: User = {
  ...MANAGER,
  id: "u1",
  role: "user",
  username: "plain",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminClient.overview).mockResolvedValue({
    registeredUsers: 0,
    packs: 0,
    plays: 0,
    onlineUsers: null,
    pendingReports: null,
  });
});

describe("AdminScreen", () => {
  it("renders the Overview tab by default for a manager", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: MANAGER,
    });
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    expect(await screen.findByText("Registered users")).toBeInTheDocument();
  });

  it("switches to the Logs tab on click", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: MANAGER,
    });
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    await screen.findByText("Registered users");
    await user.click(screen.getByRole("button", { name: "Logs" }));

    expect(await screen.findByLabelText("Filter by actor")).toBeInTheDocument();
  });

  it("redirects home for an authenticated user without admin/manager role", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: PLAIN_USER,
    });
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("shows a login prompt when unauthenticated", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("You need to be logged in to view this page."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AdminScreen`
Expected: FAIL with "Cannot find module './AdminScreen'"

- [ ] **Step 3: Write `src/features/admin/AdminScreen.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { OverviewTab } from "@/src/features/admin/OverviewTab";
import { StaffTab } from "@/src/features/admin/StaffTab";
import { UsersTab } from "@/src/features/admin/UsersTab";
import { LogsTab } from "@/src/features/admin/LogsTab";

type Tab = "overview" | "staff" | "users" | "logs";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "staff", label: "Staff" },
  { value: "users", label: "Users" },
  { value: "logs", label: "Logs" },
];

export function AdminScreen() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const allowed = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (status === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [status, allowed, router]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view this page.
        </Text>
        <Button className="mt-4" onClick={() => router.push("/auth")}>
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Admin
      </Text>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
            className={cn(
              "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-acc/30 bg-acc/10 text-acc"
                : "border-border bg-white/[0.03] text-foreground-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "users" && <UsersTab />}
      {tab === "logs" && <LogsTab />}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AdminScreen`
Expected: PASS (4 tests)

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/AdminScreen.tsx src/features/admin/AdminScreen.test.tsx
git commit -m "feat: add AdminScreen tab switcher with role gate"
```

---

### Task 9: Routing + `UserMenu` Admin link

**Files:**

- Create: `app/admin/page.tsx`
- Modify: `src/shared/components/UserMenu.tsx`
- Modify: `src/shared/components/UserMenu.test.tsx`

- [ ] **Step 1: Write `app/admin/page.tsx`**

```tsx
import type { Metadata } from "next";
import { AdminScreen } from "@/src/features/admin/AdminScreen";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return <AdminScreen />;
}
```

- [ ] **Step 2: Add a failing test to `UserMenu.test.tsx`**

Add this test inside the existing `describe("UserMenu", ...)` block, after the existing "opens the menu on click..." test:

```tsx
it("shows an Admin link for a manager/admin role but not for a plain user", async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <UserMenu user={{ ...USER, role: "manager" }} onLogout={vi.fn()} />,
  );
  await user.click(screen.getByRole("button", { name: "Account menu" }));
  expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute(
    "href",
    "/admin",
  );

  rerender(<UserMenu user={USER} onLogout={vi.fn()} />);
  expect(
    screen.queryByRole("menuitem", { name: "Admin" }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- UserMenu`
Expected: FAIL — "Admin" menuitem not found

- [ ] **Step 4: Add the Admin link to `UserMenu.tsx`**

In `src/shared/components/UserMenu.tsx`, insert this block right after the existing Settings `<Link>` (currently lines 72-79) and before the "Log out" `<button>`:

```tsx
{
  (user.role === "admin" || user.role === "manager") && (
    <Link
      href="/admin"
      role="menuitem"
      onClick={() => setOpen(false)}
      className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
    >
      Admin
    </Link>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- UserMenu`
Expected: PASS (all UserMenu tests)

- [ ] **Step 6: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both clean (the build step catches any App Router route misconfiguration `npm run typecheck` alone would miss)

- [ ] **Step 7: Commit**

```bash
git add app/admin/page.tsx src/shared/components/UserMenu.tsx src/shared/components/UserMenu.test.tsx
git commit -m "feat: wire up /admin route and Admin link in UserMenu"
```

---

### Task 10: Verify + review + manual test + PR + merge (closes velanto-frontend#50, #30)

- [ ] **Step 1: Run the full verification suite**

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Expected: all four green. Fix any failures before proceeding (do not skip ahead with red output).

- [ ] **Step 2: Re-check the diff against the public-repo boundary**

Read `.claude/docs/public-repo-boundary.md` and diff the branch against `develop`. Confirm: no secrets/env values, no backend-internal specifics beyond the API shapes already implied by the endpoints themselves (paths, field names — allowed per that doc), no real user data in test fixtures.

- [ ] **Step 3: Dispatch review agents**

Dispatch `code-reviewer` and `ui-guardian` (always required per `.claude/docs/git-workflow.md` / `pull-request.md`) against the full diff. Also dispatch `architecture-guardian` since this branch adds a new route (`app/admin/`) and a new feature directory (`src/features/admin/`). Fix any real findings, re-run Step 1 after fixes, and re-review only the changed files if fixes were non-trivial.

- [ ] **Step 4: Manual browser verification**

Using the Claude Preview tooling against a running `frontend` dev server (and a running `backend` dev server, since this screen is fully data-dependent):

- Log in as a seeded `admin` or `manager` user (or promote a test user directly via Prisma Studio/DB if no staff account exists yet) and confirm the Admin link appears in `UserMenu` and `/admin` renders all four tabs.
- Confirm Overview shows real counts and em-dashes for online users/pending reports.
- Confirm Staff tab lets a manager promote a `user` to `moderator` but does not offer `manager` as an option.
- Confirm Users tab search filters results, and a ban/unban round-trip updates the row's status text live.
- Confirm Logs tab shows the `ban_user`/`role_change` entries generated by the actions just taken, and that a filter narrows the list.
- Log in as a plain `user` and confirm `/admin` redirects home and no Admin link appears in the menu.
- Check the browser console for errors throughout.

- [ ] **Step 5: Push, open PR, merge**

```bash
git push -u origin <branch-name>
```

Open a PR into `develop` titled something like "Add Admin screen (Overview/Staff/Users/Logs)" with body covering: what changed, why, test files + the manual verification steps from Step 4, `Closes #50`. Wait for CI (lint/typecheck/test/build) to go green, then squash-merge.

- [ ] **Step 6: Close issues manually**

This repo's issues only auto-close on merge to `main` (the default branch), not `develop` — manually close velanto-frontend#50 and its parent velanto-frontend#30 (confirm #30 is still open and really is the right parent before closing it).

- [ ] **Step 7: Sync local `develop` and delete the feature branch**

```bash
git checkout develop
git pull
git branch -d <branch-name>
```
