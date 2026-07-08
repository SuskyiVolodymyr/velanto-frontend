# Trust Factor (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the backend's new `trusted` flag in the admin Users tab: show current status, and let a moderator+ toggle it with one click.

**Architecture:** `AdminUserRow` gains a `trusted: boolean` field. `usersClient` gains a `setTrusted(id, trusted)` call mirroring the existing `ban`/`unban`/`changeRole` methods. `UsersTab.tsx` renders a "Trust"/"Untrust" button next to the existing Ban/Unban button, gated behind the same `canActOn` check.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest + React Testing Library.

**Depends on:** velanto-backend#69 (the `PATCH /users/:id/trusted` endpoint) — build this after that backend plan has merged.

---

### Task 1: `AdminUserRow` type gains `trusted`

**Files:**
- Modify: `src/shared/types/admin.ts:11-18`

- [ ] **Step 1: Add the field**

In `src/shared/types/admin.ts`, add `trusted: boolean;` to `AdminUserRow`:

```ts
export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  bannedUntil: string | null;
  trusted: boolean;
}
```

There's no dedicated test file for this type-only file. This is a pure type change; the fixture updates that make existing tests compile again happen in Task 3 (where `UsersTab.test.tsx`'s `TARGET` fixture needs the new required field).

- [ ] **Step 2: Verify the type change alone doesn't break the build yet**

Run: `npm run typecheck`
Expected: FAILS at this point — `UsersTab.test.tsx`'s `TARGET` object literal is missing the now-required `trusted` field. This is expected; Task 3 fixes it. Do not "fix" it here by making the field optional — the backend always returns it (see `admin.service.ts`'s `listUsers()` mapping), so it should stay required.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/admin.ts
git commit -m "feat: add trusted field to AdminUserRow"
```

---

### Task 2: `usersClient.setTrusted()`

**Files:**
- Modify: `src/shared/lib/users-client.ts`

- [ ] **Step 1: Add the result type and client method**

In `src/shared/lib/users-client.ts`, add a result interface next to `ChangeRoleResult` (after line 25):

```ts
export interface SetTrustedResult {
  id: string;
  trusted: boolean;
}
```

Then add the method to the `usersClient` object (after `changeRole`, line 44):

```ts
  setTrusted: (id: string, trusted: boolean) =>
    apiClient.patch<SetTrustedResult>(`/users/${id}/trusted`, { trusted }),
```

There's no dedicated unit test for this file (mirroring `ban`/`unban`/`changeRole`, none of which have their own test — they're exercised through `UsersTab.test.tsx` in Task 3, which mocks the whole `usersClient` module).

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: still fails for the same pre-existing `UsersTab.test.tsx` reason as Task 1 (not a new failure) — confirm the error output is still exactly the "missing `trusted` property on `TARGET`" one, not something new about `users-client.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/users-client.ts
git commit -m "feat: add usersClient.setTrusted"
```

---

### Task 3: `UsersTab.tsx` — Trust/Untrust button

**Files:**
- Modify: `src/features/admin/UsersTab.tsx`
- Test: `src/features/admin/UsersTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/features/admin/UsersTab.test.tsx`:

1. Add `trusted: false` to the `TARGET` fixture (line 31-38):

```ts
const TARGET: AdminUserRow = {
  id: "u2",
  username: "bob",
  email: "bob@example.com",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  bannedUntil: null,
  trusted: false,
};
```

2. Add `setTrusted: vi.fn()` to the `usersClient` mock (line 19-21):

```ts
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { ban: vi.fn(), unban: vi.fn(), setTrusted: vi.fn() },
}));
```

3. Add these two tests inside `describe("UsersTab", ...)`, after the existing `"does not show a Ban button..."` test:

```ts
  it("shows a Trust button for an untrusted target and marks them trusted on click", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    vi.mocked(usersClient.setTrusted).mockResolvedValue({ id: "u2", trusted: true });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Trust" }));

    await waitFor(() => expect(usersClient.setTrusted).toHaveBeenCalledWith("u2", true));
    expect(await screen.findByRole("button", { name: "Untrust" })).toBeInTheDocument();
  });

  it("shows an Untrust button for a trusted target and reverts them on click", async () => {
    const trustedTarget: AdminUserRow = { ...TARGET, trusted: true };
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [trustedTarget], total: 1, page: 1, limit: 20 });
    vi.mocked(usersClient.setTrusted).mockResolvedValue({ id: "u2", trusted: false });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Untrust" }));

    await waitFor(() => expect(usersClient.setTrusted).toHaveBeenCalledWith("u2", false));
    expect(await screen.findByRole("button", { name: "Trust" })).toBeInTheDocument();
  });

  it("does not show a Trust button for a target the actor cannot act on (equal rank)", async () => {
    const peerAdmin: AdminUserRow = { ...TARGET, id: "u3", username: "peer", role: "admin" };
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [peerAdmin], total: 1, page: 1, limit: 20 });
    renderAsAdmin();

    await screen.findByText("peer");
    expect(screen.queryByRole("button", { name: "Trust" })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- UsersTab.test.tsx`
Expected: FAIL — no "Trust"/"Untrust" button exists yet in `UsersTab.tsx`.

- [ ] **Step 3: Implement**

In `src/features/admin/UsersTab.tsx`:

1. Add an `actionError`-adjacent handler, right after `handleUnban` (after line 101):

```ts
  async function handleSetTrusted(id: string, trusted: boolean) {
    setActionError("");
    try {
      await usersClient.setTrusted(id, trusted);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, trusted } : u)));
    } catch {
      setActionError(`Couldn't ${trusted ? "trust" : "untrust"} this user. Try again.`);
    }
  }
```

2. In the JSX, inside the `canAct && (...)` block (line 142-164), add the new button alongside the Ban/Unban button:

```tsx
                  {canAct && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void handleSetTrusted(row.id, !row.trusted)}
                      >
                        {row.trusted ? "Untrust" : "Trust"}
                      </Button>
                      {banned ? (
                        <Button variant="secondary" onClick={() => void handleUnban(row.id)}>
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const opening = banTargetId !== row.id;
                            setBanTargetId(opening ? row.id : null);
                            if (opening) {
                              setBanDuration("week");
                              setBanReason("");
                            }
                          }}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  )}
```

(Only the new `Button` block is added; the existing `banned ? ... : ...` structure is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- UsersTab.test.tsx`
Expected: PASS (all tests in the file, including the pre-existing ban/unban ones).

- [ ] **Step 5: Run the full typecheck**

Run: `npm run typecheck`
Expected: PASS now (Tasks 1 and 2's deferred failures are resolved by this fixture update).

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/UsersTab.tsx src/features/admin/UsersTab.test.tsx
git commit -m "feat: add Trust/Untrust toggle to the admin Users tab"
```

---

### Task 4: Verify + review + PR + merge

- [ ] **Step 1: Full verification**

Run: `npm test && npm run test:e2e && npm run typecheck && npm run lint`
Expected: all green.

- [ ] **Step 2: Whole-branch review**

Dispatch `pr-review-toolkit:code-reviewer` against the full diff of `feature/trust-factor` vs `develop`. Fix any Important+ findings and re-run Step 1.

- [ ] **Step 3: Manual browser verification**

Against the live backend (with the trust-factor backend branch merged and both dev servers running): log in as a moderator+ test account, open Admin → Users, find a test user, click "Trust", confirm the button flips to "Untrust" and the label persists across a page reload (re-fetch shows `trusted: true`). Then, logged in as that now-trusted user, publish a new pack via Create → Publish and confirm it appears directly in the Discover feed (no "Pending review" badge on their Profile page).

- [ ] **Step 4: Push, open PR against `develop`, merge**

```bash
git push -u origin feature/trust-factor
```

Open a PR titled something like "Add Trust/Untrust toggle to admin Users tab" against `develop`. Merge once green (per this repo's established `develop`-not-`main` workflow and the user's standing authorization to merge Claude-authored PRs without asking each time).

Note: this repo has no linked GitHub issue of its own for this slice (the tracking issue, velanto-backend#69, lives in the backend repo) — no issue-close step here.
