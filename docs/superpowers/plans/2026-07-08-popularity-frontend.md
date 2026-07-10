# Popularity Filter (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users sort the home feed by popularity over a chosen time window, via the already-shipped backend `GET /packs?sort=popular&window=...`.

**Architecture:** Extend `ListPacksFilters`/`buildListQuery` in `packs-client.ts` with `sort`/`window`; add a sort-pill toggle and a conditionally-rendered window-pill group to `HomeFeed.tsx`, following the exact same pattern as the existing format pills.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

---

### Task 1: `packsClient` — `sort`/`window` query params

**Files:**

- Modify: `src/shared/lib/packs-client.ts`
- Test: `src/shared/lib/packs-client.test.ts` (create if it doesn't exist — check first; if a test file already exists for this module, add to it)

- [ ] **Step 1: Write the failing tests**

Check whether `src/shared/lib/packs-client.test.ts` already exists. If it does, read it first and match its existing mocking pattern for `apiClient`/`fetch`. If it doesn't exist, create it with this pattern (adjust the mock setup to match how sibling test files in `src/shared/lib/*.test.ts` mock `apiClient` — check `plays-client.test.ts` or similar first for the established mock shape in this repo):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { packsClient } from "@/src/shared/lib/packs-client";
import { apiClient } from "@/src/shared/lib/api-client";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe("packsClient.list — sort/window query params", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    });
  });

  it("omits sort/window when not provided", async () => {
    await packsClient.list({ limit: 50 });
    expect(apiClient.get).toHaveBeenCalledWith("/packs?limit=50");
  });

  it("includes sort=popular when provided", async () => {
    await packsClient.list({ sort: "popular", limit: 50 });
    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(url).toContain("sort=popular");
  });

  it("includes window when provided alongside sort=popular", async () => {
    await packsClient.list({ sort: "popular", window: "week", limit: 50 });
    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(url).toContain("sort=popular");
    expect(url).toContain("window=week");
  });

  it("omits window when sort is not provided, even if window is set", async () => {
    // Defensive: buildListQuery should not need to know about this invariant,
    // it just serializes whatever filters it's given — this test documents
    // that the CALLER (HomeFeed) is responsible for not setting window
    // without sort, not buildListQuery itself.
    await packsClient.list({ window: "week", limit: 50 });
    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(url).toContain("window=week");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- packs-client`
Expected: FAIL — `sort`/`window` are not valid `ListPacksFilters` keys (TypeScript error) and/or the query string never contains them.

- [ ] **Step 3: Implement**

In `src/shared/lib/packs-client.ts`, update `ListPacksFilters`:

```ts
export interface ListPacksFilters {
  format?: PackFormat;
  tags?: PackTag[];
  q?: string;
  page?: number;
  limit?: number;
  authorId?: string;
  sort?: "popular";
  window?: "day" | "week" | "month" | "year" | "all";
}
```

And `buildListQuery`, adding after the existing `authorId` line:

```ts
if (filters.sort) params.set("sort", filters.sort);
if (filters.window) params.set("window", filters.window);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- packs-client`
Expected: PASS, all 4 new tests green.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/packs-client.ts src/shared/lib/packs-client.test.ts
git commit -m "feat: add sort/window params to packsClient.list()"
```

---

### Task 2: `HomeFeed` — sort toggle + window picker

**Files:**

- Modify: `src/features/home/HomeFeed.tsx`
- Test: `src/features/home/HomeFeed.test.tsx` (check if it exists first — read and match its existing mocking pattern for `packsClient`; if none exists, mock `packsClient.list` the same way Task 1 mocks `apiClient`)

- [ ] **Step 1: Write the failing tests**

Add (or create the file with) these cases, adapting to the existing file's exact mock/render helper conventions if `HomeFeed.test.tsx` already exists:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeFeed } from "@/src/features/home/HomeFeed";
import { packsClient } from "@/src/shared/lib/packs-client";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { list: vi.fn() },
}));

describe("HomeFeed — popularity sort", () => {
  beforeEach(() => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    });
  });

  it("does not send sort/window by default", async () => {
    render(<HomeFeed />);
    await waitFor(() => expect(packsClient.list).toHaveBeenCalled());
    const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
    expect(lastCall?.sort).toBeUndefined();
    expect(lastCall?.window).toBeUndefined();
  });

  it("sends sort=popular and window=week (default) when Popular is clicked", async () => {
    const user = userEvent.setup();
    render(<HomeFeed />);
    await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Popular" }));

    await waitFor(() => {
      const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
      expect(lastCall?.sort).toBe("popular");
      expect(lastCall?.window).toBe("week");
    });
  });

  it("shows the window picker only when Popular is active", async () => {
    const user = userEvent.setup();
    render(<HomeFeed />);
    await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Popular" }));
    expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Relevance" }));
    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
  });

  it("changing the window while Popular is active sends the new window", async () => {
    const user = userEvent.setup();
    render(<HomeFeed />);
    await waitFor(() => expect(packsClient.list).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Popular" }));
    await waitFor(() => {
      const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
      expect(lastCall?.window).toBe("week");
    });

    await user.click(screen.getByRole("button", { name: "Month" }));

    await waitFor(() => {
      const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
      expect(lastCall?.sort).toBe("popular");
      expect(lastCall?.window).toBe("month");
    });
  });

  it("switching back to Relevance omits sort and window from the next request", async () => {
    const user = userEvent.setup();
    render(<HomeFeed />);
    await waitFor(() => expect(packsClient.list).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Popular" }));
    await waitFor(() => {
      const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
      expect(lastCall?.sort).toBe("popular");
    });

    await user.click(screen.getByRole("button", { name: "Relevance" }));

    await waitFor(() => {
      const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
      expect(lastCall?.sort).toBeUndefined();
      expect(lastCall?.window).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- HomeFeed`
Expected: FAIL — no "Popular"/"Relevance"/window-picker buttons exist yet.

- [ ] **Step 3: Implement**

In `src/features/home/HomeFeed.tsx`:

Add types and constants near `FORMAT_OPTIONS`:

```ts
type SortFilter = "relevance" | "popular";
type WindowFilter = "day" | "week" | "month" | "year" | "all";

const SORT_OPTIONS: { value: SortFilter; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "popular", label: "Popular" },
];

const WINDOW_OPTIONS: { value: WindowFilter; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

const DEFAULT_POPULAR_WINDOW: WindowFilter = "week";
```

Add state, alongside existing `format`/`tags`/etc:

```ts
const [sort, setSort] = useState<SortFilter>("relevance");
const [window, setWindow] = useState<WindowFilter>(DEFAULT_POPULAR_WINDOW);
```

Update the fetch `useEffect`'s call and dependency array:

```ts
    packsClient
      .list({
        format: format === "all" ? undefined : format,
        tags,
        q: query || undefined,
        limit: PAGE_SIZE,
        sort: sort === "popular" ? "popular" : undefined,
        window: sort === "popular" ? window : undefined,
      })
      .then((result) => {
        if (cancelled) return;
        setPacks(result.items);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [format, tags, query, sort, window]);
```

Add the sort pill group in the JSX, right after the existing format pill group (reuses the exact same pill button markup/classes — extract nothing new, just repeat the pattern for a second `.map()`):

```tsx
<div className="flex flex-wrap gap-2">
  {SORT_OPTIONS.map((option) => (
    <button
      key={option.value}
      type="button"
      onClick={() => setSort(option.value)}
      aria-pressed={sort === option.value}
      className={cn(
        "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
        sort === option.value
          ? "border-acc/30 bg-acc/10 text-acc"
          : "border-border bg-white/[0.03] text-foreground-secondary",
      )}
    >
      {option.label}
    </button>
  ))}
</div>;

{
  sort === "popular" && (
    <div className="flex flex-wrap gap-2">
      {WINDOW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setWindow(option.value)}
          aria-pressed={window === option.value}
          className={cn(
            "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
            window === option.value
              ? "border-acc/30 bg-acc/10 text-acc"
              : "border-border bg-white/[0.03] text-foreground-secondary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

Note: `window` as a state variable name shadows the global `window` object. This file is a client component that doesn't reference `globalThis.window` anywhere currently (confirm via search before implementing) — if it turns out something does need the global, rename the state variable to `popularityWindow` instead and update all references accordingly. Prefer catching this yourself during implementation over leaving a latent shadowing bug.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- HomeFeed`
Expected: PASS, all 5 new tests green plus all pre-existing `HomeFeed` tests still green.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/HomeFeed.tsx src/features/home/HomeFeed.test.tsx
git commit -m "feat: add popularity sort + window picker to HomeFeed"
```

---

### Task 3: Verify + review + manual browser test + PR + merge

- [ ] **Step 1: Full verify sequence**

```bash
npm test
npm run typecheck
npm run lint
```

All must be clean before proceeding.

- [ ] **Step 2: Whole-branch code review**

Dispatch `pr-review-toolkit:code-reviewer` against the full diff of `feature/popularity-frontend` vs `develop` (both commits from Tasks 1–2). Confirm: `sort`/`window` are correctly threaded from `HomeFeed` state through `packsClient.list()`; the window picker only renders/sends when `sort=popular`; the pill-button pattern is genuinely reused (not duplicated with drift) from `FORMAT_OPTIONS`; no dead code, no `window` global-shadowing bug left unresolved. Fix any Critical/Important findings and re-run Step 1.

- [ ] **Step 3: Manual browser verification**

Using Claude Preview against the running dev server (frontend on :3000, backend on :3001):

- Load the home feed, confirm default order unchanged (no `sort`/`window` sent — check via `preview_network`).
- Click "Popular", confirm the request now includes `sort=popular&window=week` and the pack order visibly changes/re-fetches.
- Click through each window option (Day/Month/Year/All), confirm each changes the request's `window` param.
- Click "Relevance", confirm `sort`/`window` are omitted again.
- Combine with an existing filter (e.g. a format pill or a tag) to confirm they compose correctly in the same request.

- [ ] **Step 4: Push, PR, merge**

```bash
git push -u origin feature/popularity-frontend
```

Open a PR against `develop` (not `main`) summarizing the change and linking `Closes #56`. Once verify gates and review are clean, merge to `develop` and manually close `velanto-frontend#56` (issues in this repo don't auto-close on merge to develop, only to main).
