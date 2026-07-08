# Pack Vote Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add like/dislike buttons + score display to the Pack detail screen (velanto-frontend#55), backed by the merged votes backend (velanto-backend#57).

**Architecture:** `Pack` type gains vote fields (already sent by the backend on every pack response). `packsClient` gains `vote()`/`unvote()`. A new `VoteButtons` client component renders on the pack detail page, managing local state after each click — no icon library, plain text-labeled buttons matching the `Follow`/`Ban` button convention already established this session.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

**Design doc:** `docs/superpowers/specs/2026-07-08-vote-buttons-design.md`

---

### Task 1: `Pack` type + `packsClient` additions

**Files:**
- Modify: `src/shared/types/pack.ts`
- Modify: `src/shared/lib/packs-client.ts`
- Test: `src/shared/lib/packs-client.test.ts`

- [ ] **Step 1: Write the failing tests**

Read `src/shared/lib/packs-client.test.ts` first to match its existing mock/assertion style exactly, then add:

```ts
it("vote() POSTs to /packs/:id/vote with the given value", async () => {
  const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ score: 1, likes: 1, dislikes: 0, myVote: 1 });
  const result = await packsClient.vote("pack-1", 1);
  expect(postSpy).toHaveBeenCalledWith("/packs/pack-1/vote", { value: 1 });
  expect(result).toEqual({ score: 1, likes: 1, dislikes: 0, myVote: 1 });
});

it("unvote() DELETEs /packs/:id/vote", async () => {
  const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue({ score: 0, likes: 0, dislikes: 0, myVote: null });
  const result = await packsClient.unvote("pack-1");
  expect(deleteSpy).toHaveBeenCalledWith("/packs/pack-1/vote");
  expect(result).toEqual({ score: 0, likes: 0, dislikes: 0, myVote: null });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- packs-client`
Expected: FAIL — `packsClient.vote`/`unvote` are not functions.

- [ ] **Step 3: Add vote fields to the `Pack` type**

In `src/shared/types/pack.ts`, add to the `Pack` interface (alongside `status`/`rejectionReason`):

```ts
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
```

- [ ] **Step 4: Add `vote`/`unvote` to `packsClient`**

In `src/shared/lib/packs-client.ts`, add a `VoteResult` interface near the top:

```ts
export interface VoteResult {
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}
```

Add to the `packsClient` object:

```ts
  vote: (id: string, value: 1 | -1) => apiClient.post<VoteResult>(`/packs/${id}/vote`, { value }),
  unvote: (id: string) => apiClient.delete<VoteResult>(`/packs/${id}/vote`),
```

Confirm `apiClient.delete` already exists (it was added during the reports-backend frontend work — check `src/shared/lib/api-client.ts` before assuming, but this repo's `packsClient.delete()` for pack deletion already uses it, so it should already be there).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- packs-client`
Expected: PASS.

- [ ] **Step 6: Fix any other files that construct a `Pack` object literal directly**

The `Pack` type widening will break test fixtures across the codebase that build a full `Pack` object literal (this has happened 3+ times already this session — `status`/`rejectionReason` needed backfilling into ~10 files when that field was added). Run `npm run typecheck` now and fix every resulting error by adding `score: 0, likes: 0, dislikes: 0, myVote: null` to each broken fixture (a neutral, no-votes default — don't invent per-fixture values unless a specific test actually needs a non-zero vote state).

- [ ] **Step 7: Run full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: both fully clean.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add vote fields to Pack type, add packsClient.vote()/unvote()"
```

(Using `git add -A` here deliberately, since Step 6 may touch an unpredictable number of fixture files across the codebase — review `git status`/`git diff --stat` before committing to confirm only test fixtures and the two planned files changed, nothing unrelated.)

---

### Task 2: `VoteButtons` component

**Files:**
- Create: `src/features/pack/VoteButtons.tsx`
- Test: `src/features/pack/VoteButtons.test.tsx`

- [ ] **Step 1: Write the failing tests**

Read `src/features/author/AuthorScreen.test.tsx`'s follow-button tests first for this repo's exact `useAuth`/`next/navigation` mocking convention before writing these:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoteButtons } from "./VoteButtons";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/packs/pack-1",
}));

const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(authenticated: boolean) {
  mockedUseAuth.mockReturnValue({
    user: authenticated ? { id: "u1", email: "a@x.com", username: "a", role: "user", createdAt: "" } : null,
    status: authenticated ? "authenticated" : "unauthenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("VoteButtons", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders like/dislike counts from the initial props", () => {
    mockAuth(true);
    render(<VoteButtons packId="pack-1" initialScore={2} initialLikes={3} initialDislikes={1} initialMyVote={null} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("clicking Like calls packsClient.vote with value 1 and updates counts from the response", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockResolvedValue({ score: 1, likes: 1, dislikes: 0, myVote: 1 });
    render(<VoteButtons packId="pack-1" initialScore={0} initialLikes={0} initialDislikes={0} initialMyVote={null} />);
    await userEvent.click(screen.getByRole("button", { name: /like/i }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("clicking the currently-active Like button again toggles it off (still calls vote with value 1)", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockResolvedValue({ score: 0, likes: 0, dislikes: 0, myVote: null });
    render(<VoteButtons packId="pack-1" initialScore={1} initialLikes={1} initialDislikes={0} initialMyVote={1} />);
    await userEvent.click(screen.getByRole("button", { name: /like/i }));
    expect(mockedPacksClient.vote).toHaveBeenCalledWith("pack-1", 1);
    await waitFor(() => expect(screen.getByText("0")).toBeInTheDocument());
  });

  it("redirects an anonymous viewer to /auth on click instead of calling the API", async () => {
    mockAuth(false);
    render(<VoteButtons packId="pack-1" initialScore={0} initialLikes={0} initialDislikes={0} initialMyVote={null} />);
    await userEvent.click(screen.getByRole("button", { name: /like/i }));
    expect(mockedPacksClient.vote).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fpacks%2Fpack-1");
  });

  it("shows an inline error and does not change counts when the vote call fails", async () => {
    mockAuth(true);
    mockedPacksClient.vote.mockRejectedValue(new Error("network"));
    render(<VoteButtons packId="pack-1" initialScore={0} initialLikes={0} initialDislikes={0} initialMyVote={null} />);
    await userEvent.click(screen.getByRole("button", { name: /like/i }));
    await waitFor(() => expect(screen.getByText(/couldn't/i)).toBeInTheDocument());
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- VoteButtons`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `VoteButtons.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";

export function VoteButtons({
  packId,
  initialScore,
  initialLikes,
  initialDislikes,
  initialMyVote,
}: {
  packId: string;
  initialScore: number;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
}) {
  const { status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleVote(value: 1 | -1) {
    if (authStatus !== "authenticated") {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await packsClient.vote(packId, value);
      setLikes(result.likes);
      setDislikes(result.dislikes);
      setMyVote(result.myVote);
    } catch {
      setError("Couldn't record your vote. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={myVote === 1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleVote(1)}
      >
        Like {likes}
      </Button>
      <Button
        variant={myVote === -1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleVote(-1)}
      >
        Dislike {dislikes}
      </Button>
      {error && (
        <Text className="text-xs text-[#ff6b6b]">{error}</Text>
      )}
    </div>
  );
}
```

Note: `initialScore` is accepted as a prop (matching the design spec's data-flow description and keeping the component's prop shape self-describing/future-proof) but not directly rendered in this minimal layout — `likes`/`dislikes` are the two numbers actually shown. If a combined "score" display is wanted visually, add a third `<Text>` computing `likes - dislikes` from local state; the plan's test suite above doesn't require one, so don't add UI the tests don't cover.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- VoteButtons`
Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/pack/VoteButtons.tsx src/features/pack/VoteButtons.test.tsx
git commit -m "feat: add VoteButtons component with like/dislike toggle and auth redirect"
```

---

### Task 3: Wire into the Pack detail page

**Files:**
- Modify: `app/packs/[id]/page.tsx`

- [ ] **Step 1: Add `VoteButtons` to the page**

In `app/packs/[id]/page.tsx`, add the import:

```ts
import { VoteButtons } from "@/src/features/pack/VoteButtons";
```

Add the component directly below the `PackCoverBanner` block (before the description `<Text>`):

```tsx
      <div className="mb-6">
        <PackCoverBanner pack={pack} />
      </div>
      <div className="mb-4">
        <VoteButtons
          packId={pack.id}
          initialLikes={pack.likes}
          initialDislikes={pack.dislikes}
          initialMyVote={pack.myVote}
        />
      </div>
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all green (no dedicated test file exists for this route wrapper per this repo's established thin-Server-Component convention — verified already for `/support`/`/users/[id]` earlier this session; rely on manual browser verification in Task 4 instead).

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/packs/[id]/page.tsx"
git commit -m "feat: wire VoteButtons into the Pack detail page"
```

---

### Task 4: Verify + review + manual test + PR + merge

- [ ] **Step 1: Full verify sequence**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all green. Re-run fresh yourself rather than trusting stale editor diagnostics.

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer`**

Review the full diff against `develop`. Fix any Critical/Important findings and re-verify (Step 1) after each fix.

- [ ] **Step 3: Manual browser verification (Claude Preview)**

Start both `backend` and `frontend` preview servers. As a logged-in user, navigate to a pack detail page, click Like, confirm the count updates and the button highlights; click Like again, confirm it toggles off; click Dislike, confirm it switches. As an anonymous viewer, confirm clicking either button redirects to `/auth?next=...`.

- [ ] **Step 4: Push, open PR, merge**

Follow this repo's standing workflow and the standing autonomous-merge authorization for own-authored branches. Push, open a PR against `develop`, merge once green.

- [ ] **Step 5: Close the GitHub issue**

Manually close velanto-frontend#55.
