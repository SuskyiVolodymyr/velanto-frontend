# Pack Moderation Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A moderator+ screen at `/moderation` listing pending packs with approve/reject actions, per frontend#54 (the Profile "My Packs" pending/rejected badge is already shipped — see design spec for confirmation, not part of this plan).

**Architecture:** New `packsClient` methods (`moderationQueue`, `approve`, `reject`) calling the already-shipped backend endpoints; a new `ModerationQueueScreen` component closely mirroring the existing `SupportScreen.tsx` template (auth-gating, pagination, "Load more"); a new `/moderation` route; a new nav link in `UserMenu.tsx`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

---

### Task 1: `packsClient` — moderation methods

**Files:**

- Modify: `src/shared/lib/packs-client.ts`
- Test: `src/shared/lib/packs-client.test.ts` (already exists — add to it)

- [ ] **Step 1: Write the failing tests**

Read `src/shared/lib/packs-client.test.ts` first to match its exact mock pattern, then add:

```ts
describe("packsClient.moderationQueue", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it("calls GET /packs/moderation-queue with page/limit", async () => {
    await packsClient.moderationQueue({ page: 2, limit: 20 });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/packs/moderation-queue?page=2&limit=20",
    );
  });

  it("calls with no query string when no filters given", async () => {
    await packsClient.moderationQueue();
    expect(apiClient.get).toHaveBeenCalledWith("/packs/moderation-queue");
  });
});

describe("packsClient.approve", () => {
  it("calls POST /packs/:id/approve with no body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await packsClient.approve("pack-1");
    expect(apiClient.post).toHaveBeenCalledWith("/packs/pack-1/approve");
  });
});

describe("packsClient.reject", () => {
  it("calls POST /packs/:id/reject with a reason", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await packsClient.reject("pack-1", "Duplicate of an existing pack");
    expect(apiClient.post).toHaveBeenCalledWith("/packs/pack-1/reject", {
      reason: "Duplicate of an existing pack",
    });
  });

  it("calls POST /packs/:id/reject with an empty reason when none given", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await packsClient.reject("pack-1");
    expect(apiClient.post).toHaveBeenCalledWith("/packs/pack-1/reject", {
      reason: undefined,
    });
  });
});
```

Adjust exact assertions to match the file's real mock/return-value conventions once you've read it — the intent is what matters (right method, right URL, right body).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- packs-client`
Expected: FAIL — `moderationQueue`/`approve`/`reject` don't exist on `packsClient` yet.

- [ ] **Step 3: Implement**

In `src/shared/lib/packs-client.ts`, add to the `packsClient` object (alongside `list`/`delete`/`vote`):

```ts
  moderationQueue: (filters: { page?: number; limit?: number } = {}) =>
    apiClient.get<PackList>(`/packs/moderation-queue${buildListQuery(filters)}`),
  approve: (id: string) => apiClient.post<Pack>(`/packs/${id}/approve`),
  reject: (id: string, reason?: string) => apiClient.post<Pack>(`/packs/${id}/reject`, { reason }),
```

`buildListQuery` already handles `page`/`limit` correctly since those are two of its existing `ListPacksFilters` fields — no changes needed there. `moderationQueue`'s parameter type is a narrower inline type (not `ListPacksFilters`) since the endpoint only accepts `page`/`limit`, not the full filter set.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- packs-client`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/packs-client.ts src/shared/lib/packs-client.test.ts
git commit -m "feat: add moderationQueue/approve/reject to packsClient"
```

---

### Task 2: `ModerationQueueScreen` component

**Files:**

- Create: `src/features/moderation/ModerationQueueScreen.tsx`
- Test: `src/features/moderation/ModerationQueueScreen.test.tsx`

Read `src/features/support/SupportScreen.tsx` and `src/features/support/SupportScreen.test.tsx` in full first — this task mirrors them closely. Read `src/shared/lib/pack-display.ts` for `FORMAT_LABELS`/`getRoundsCount`, and `src/shared/components/Badge.tsx` for the badge API.

- [ ] **Step 1: Write the failing tests**

Create `ModerationQueueScreen.test.tsx` following `SupportScreen.test.tsx`'s exact structure/mocking conventions (mock `useAuth`, mock `packsClient`, mock `next/navigation`). Cover:

1. Redirects to `/` when authenticated but role is not moderator+.
2. Renders nothing (or a login prompt) when unauthenticated.
3. Renders the queue list for a moderator/manager/admin user, showing each pack's title and format.
4. Shows the empty state ("No packs waiting for review.") when the queue is empty.
5. Clicking "Approve" on a row calls `packsClient.approve(pack.id)` and, on success, removes that row from the list.
6. Clicking "Reject" expands a reason textarea; typing a reason and clicking "Confirm reject" calls `packsClient.reject(pack.id, reason)` and removes the row on success.
7. Clicking "Reject" then "Confirm reject" with an empty textarea still calls `packsClient.reject(pack.id, undefined)` (or `""` — match whatever the component actually sends; the backend accepts both since `reason` is optional).
8. A failed approve/reject call shows a per-row error message and leaves the row in the list.
9. "Load more" pagination works the same way as `SupportScreen`'s (bumps page, appends dedup'd results).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ModerationQueueScreen`
Expected: FAIL — component doesn't exist yet.

- [ ] **Step 3: Implement**

Structure closely follows `SupportScreen.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { FORMAT_LABELS } from "@/src/shared/lib/pack-display";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import type { Pack } from "@/src/shared/types/pack";

const PAGE_SIZE = 20;

export function ModerationQueueScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [packs, setPacks] = useState<Pack[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    packsClient
      .moderationQueue({ page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPacks(result.items);
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
  }, [allowed]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await packsClient.moderationQueue({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setPacks((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...result.items.filter((p) => !existingIds.has(p.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more packs. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleApprove(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await packsClient.approve(id);
      setPacks((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setRowError((prev) => ({
        ...prev,
        [id]: "Couldn't approve this pack. Try again.",
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleReject(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await packsClient.reject(id, rejectReason.trim() || undefined);
      setPacks((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
      setRejectingId(null);
      setRejectReason("");
    } catch {
      setRowError((prev) => ({
        ...prev,
        [id]: "Couldn't reject this pack. Try again.",
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
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
        Moderation queue
      </Text>

      {status === "loading" && <Text variant="secondary">Loading packs…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load packs. Try again later.
        </Text>
      )}
      {status === "ready" && packs.length === 0 && (
        <Text variant="secondary">No packs waiting for review.</Text>
      )}

      {status === "ready" && packs.length > 0 && (
        <div className="flex flex-col gap-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Badge>{FORMAT_LABELS[pack.format]}</Badge>
                <Text className="flex-1 truncate font-semibold">
                  {pack.title}
                </Text>
                <Link
                  href={`/packs/${pack.id}`}
                  className="text-sm text-acc hover:underline"
                >
                  View
                </Link>
                <Button
                  variant="secondary"
                  disabled={rowBusy[pack.id]}
                  onClick={() => void handleApprove(pack.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  disabled={rowBusy[pack.id]}
                  onClick={() => {
                    setRejectingId(rejectingId === pack.id ? null : pack.id);
                    setRejectReason("");
                  }}
                >
                  Reject
                </Button>
              </div>
              <Text variant="secondary" className="line-clamp-2 text-sm">
                {pack.description}
              </Text>
              {rejectingId === pack.id && (
                <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-white/[0.02] p-3">
                  <textarea
                    aria-label="Rejection reason"
                    maxLength={500}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Reason (optional)"
                    className="min-h-16 rounded-[8px] border border-border bg-transparent p-2 text-sm text-foreground"
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={rowBusy[pack.id]}
                      onClick={() => void handleReject(pack.id)}
                    >
                      Confirm reject
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setRejectingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {rowError[pack.id] && (
                <Text className="text-sm text-[#ff6b6b]">
                  {rowError[pack.id]}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}

      {status === "ready" && packs.length < total && (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void handleLoadMore()}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && (
            <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>
          )}
        </div>
      )}
    </main>
  );
}
```

Check `Button`'s actual prop API before using it verbatim (variant names, whether it accepts `disabled`) — match what `SupportScreen.tsx` already does with it rather than assuming.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ModerationQueueScreen`
Expected: PASS, all cases green.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/moderation/ModerationQueueScreen.tsx src/features/moderation/ModerationQueueScreen.test.tsx
git commit -m "feat: add ModerationQueueScreen"
```

---

### Task 3: Routing + nav link

**Files:**

- Create: `app/moderation/page.tsx`
- Modify: `src/shared/components/UserMenu.tsx`

- [ ] **Step 1: Add the route**

```tsx
import type { Metadata } from "next";
import { ModerationQueueScreen } from "@/src/features/moderation/ModerationQueueScreen";

export const metadata: Metadata = {
  title: "Moderation queue",
  robots: { index: false, follow: false },
};

export default function ModerationPage() {
  return <ModerationQueueScreen />;
}
```

- [ ] **Step 2: Add the nav link**

In `UserMenu.tsx`, read the existing Support link block (`user.role === "moderator" || "manager" || "admin"` gated) and add a sibling link immediately after it, same gate, same className:

```tsx
<Link
  href="/moderation"
  role="menuitem"
  onClick={() => setOpen(false)}
  className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
>
  Moderation
</Link>
```

- [ ] **Step 3: Check for a `UserMenu.test.tsx`**

If it exists, read it and add a case confirming the "Moderation" link renders for a moderator/manager/admin user and not for a plain user — matching however it currently tests the "Support"/"Admin" links.

- [ ] **Step 4: Run tests, typecheck, lint**

```bash
npm test -- UserMenu
npm run typecheck
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add app/moderation/page.tsx src/shared/components/UserMenu.tsx src/shared/components/UserMenu.test.tsx
git commit -m "feat: add /moderation route and nav link"
```

(Adjust the `git add` if `UserMenu.test.tsx` doesn't exist or wasn't touched.)

---

### Task 4: Verify + review + manual test + PR + merge

- [ ] **Step 1: Full verify sequence**

```bash
npm test
npm run typecheck
npm run lint
```

- [ ] **Step 2: Whole-branch code review**

Dispatch `pr-review-toolkit:code-reviewer` against the full diff of `feature/moderation-queue-screen` vs `develop`. Confirm: role gating matches the backend's `@Roles('moderator','manager','admin')` exactly (not narrower like Admin's admin/manager-only gate); approve/reject correctly remove rows only after a successful response (not optimistically before); the reject reason correctly sends `undefined` (not empty string, unless intentionally decided otherwise) when left blank; no dead code. Fix any Critical/Important findings and re-verify.

- [ ] **Step 3: Manual browser verification**

Using Claude Preview against the running dev server:

- Create a pack as a regular test user (lands as `pending` per backend#55's pre-moderation gate).
- Confirm it does NOT appear on the public Home feed.
- Confirm it DOES appear on that user's own Profile "My Packs" with a "Pending review" badge (already-shipped behavior — just confirming it still holds).
- Promote a second test account to `moderator` via `npm run set-role -- <email> moderator` (backend terminal tool).
- Log in as the moderator, navigate to `/moderation` via the new nav link, confirm the pending pack appears in the queue.
- Click "View", confirm the moderator can see the full pack content at `/packs/:id` despite it being pending.
- Back on `/moderation`, click "Reject" on one pack, type a reason, confirm, confirm it disappears from the queue.
- Confirm on the original author's Profile that the pack now shows "Rejected".
- Create a second test pack, approve it from the queue, confirm it disappears from the queue and now appears on the public Home feed.
- Confirm a non-moderator user hitting `/moderation` directly gets redirected to `/`.

- [ ] **Step 4: Push, PR, merge**

```bash
git push -u origin feature/moderation-queue-screen
```

Open a PR against `develop`, `Closes #54`. Once verify gates and review are clean, merge and manually close `velanto-frontend#54`.
