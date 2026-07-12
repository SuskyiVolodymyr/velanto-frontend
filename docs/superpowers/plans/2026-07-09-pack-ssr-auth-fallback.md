# Pack SSR Auth Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix velanto-frontend#66 — a pack's own owner or a moderator gets a 404 viewing a pending/rejected pack via direct URL/SSR — by retrying as the authenticated viewer client-side whenever the anonymous Server Component fetch returns null, instead of 404ing immediately.

**Architecture:** Three routes (`/packs/[id]`, `/packs/[id]/play`, `/packs/[id]/result`) keep their existing anonymous SSR fast path unchanged. When it returns `null`, the page now renders a small Client Component instead of calling `notFound()` immediately; that component retries via the existing authenticated `packsClient`/a new `playsClient.getResults`, rendering the real screen on success or conceding to `notFound()` on failure. A shared hook (`usePackFallback`) holds the retry logic; two small extractions (`PackDetailScreen`, `PlayRouter`) let the SSR fast path and the fallback path render identical output without duplicating JSX.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest + React Testing Library.

**Full design rationale:** `docs/superpowers/specs/2026-07-09-pack-ssr-auth-fallback-design.md` — read it once before starting if anything below is unclear on _why_, not just _what_.

---

### Task 1: `playsClient.getResults()`

**Files:**

- Modify: `src/shared/lib/plays-client.ts`

- [ ] **Step 1: Add the client method**

In `src/shared/lib/plays-client.ts`, replace the whole file with:

```ts
import { apiClient } from "@/src/shared/lib/api-client";
import type {
  PackResults,
  RankResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

export const playsClient = {
  record: (packId: string, input: { picks: RecordedPick[] }) =>
    apiClient.post<{ id: string }>(`/packs/${packId}/plays`, input),
  getResults: (packId: string) =>
    apiClient.get<PackResults | RankResults>(`/packs/${packId}/results`),
};
```

This mirrors `get-results-server.ts`'s request shape but goes through `apiClient`, which attaches the in-memory Bearer token (see `src/shared/lib/api-client.ts`). There's no dedicated unit test for this file — mirroring `record()`, which also has none; both are exercised through the components that use them (Task 4's hook test covers `getResults`).

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS, no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/plays-client.ts
git commit -m "feat: add playsClient.getResults"
```

---

### Task 2: Extract `PlayRouter`

**Files:**

- Create: `src/features/play/PlayRouter.tsx`
- Test: `src/features/play/PlayRouter.test.tsx`
- Modify: `app/packs/[id]/play/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/play/PlayRouter.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlayRouter } from "./PlayRouter";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/features/play/PlayScreen", () => ({
  PlayScreen: () => <div>PlayScreen</div>,
}));
vi.mock("@/src/features/play/RankPlayScreen", () => ({
  RankPlayScreen: () => <div>RankPlayScreen</div>,
}));
vi.mock("@/src/features/play/HeadToHeadPlayScreen", () => ({
  HeadToHeadPlayScreen: () => <div>HeadToHeadPlayScreen</div>,
}));

const BASE_PACK: Pack = {
  id: "p1",
  title: "Test",
  description: "",
  coverTone: "#000",
  format: "save_one",
  tags: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("PlayRouter", () => {
  it("renders RankPlayScreen for rank_blind packs", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "rank_blind" }} />);
    expect(screen.getByText("RankPlayScreen")).toBeInTheDocument();
  });

  it("renders HeadToHeadPlayScreen for 1v1 packs", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "1v1" }} />);
    expect(screen.getByText("HeadToHeadPlayScreen")).toBeInTheDocument();
  });

  it("renders PlayScreen for every other format", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "save_one" }} />);
    expect(screen.getByText("PlayScreen")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PlayRouter.test.tsx`
Expected: FAIL — `./PlayRouter` doesn't exist yet.

- [ ] **Step 3: Create `PlayRouter`**

Create `src/features/play/PlayRouter.tsx`:

```tsx
import type { Pack } from "@/src/shared/types/pack";
import { PlayScreen } from "@/src/features/play/PlayScreen";
import { RankPlayScreen } from "@/src/features/play/RankPlayScreen";
import { HeadToHeadPlayScreen } from "@/src/features/play/HeadToHeadPlayScreen";

export function PlayRouter({ pack }: { pack: Pack }) {
  if (pack.format === "rank_blind") return <RankPlayScreen pack={pack} />;
  if (pack.format === "1v1") return <HeadToHeadPlayScreen pack={pack} />;
  return <PlayScreen pack={pack} />;
}
```

This is the exact format-branch already in `app/packs/[id]/play/page.tsx`, extracted so both the SSR fast path and the upcoming `PlayFallback` (Task 6) share one mapping instead of duplicating it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PlayRouter.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Update `play/page.tsx` to use it**

Replace `app/packs/[id]/play/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayRouter } from "@/src/features/play/PlayRouter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? `Playing ${pack.title}` : "Pack not found" };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();
  return <PlayRouter pack={pack} />;
}
```

This is a pure extraction — behavior is unchanged (`notFound()` still fires immediately on null; the fallback wiring happens in Task 8). Note `RankPlayScreen`/`HeadToHeadPlayScreen`/`PlayScreen` imports are removed from this file since `PlayRouter` now owns them.

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/features/play/PlayRouter.tsx src/features/play/PlayRouter.test.tsx "app/packs/[id]/play/page.tsx"
git commit -m "refactor: extract PlayRouter's format branch out of play/page.tsx"
```

---

### Task 3: Extract `PackDetailScreen`

**Files:**

- Create: `src/features/pack/PackDetailScreen.tsx`
- Test: `src/features/pack/PackDetailScreen.test.tsx`
- Modify: `app/packs/[id]/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/pack/PackDetailScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PackDetailScreen } from "./PackDetailScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/features/pack/VoteButtons", () => ({
  VoteButtons: () => <div>VoteButtons</div>,
}));
vi.mock("@/src/features/pack/CommentSection", () => ({
  CommentSection: () => <div>CommentSection</div>,
}));

const BASE_PACK: Pack = {
  id: "p1",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      selectionMode: "manual",
      items: [
        { id: "i1", type: "text", title: "Opening A", value: "Opening A" },
      ],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 3,
  dislikes: 1,
  myVote: null,
};

const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("PackDetailScreen", () => {
  it("renders the pack's title, description, and a Play link", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} />);
    expect(screen.getByText("Best Anime Openings")).toBeInTheDocument();
    expect(
      screen.getByText("Pick your favorite each round."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Play" })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
  });

  it("renders each group's name and items for a non-nxn pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} />);
    expect(screen.getByText("2016")).toBeInTheDocument();
    expect(screen.getByText("Opening A")).toBeInTheDocument();
  });

  it("renders categories (not groups) for an nxn pack", () => {
    const nxnPack: Pack = {
      ...BASE_PACK,
      format: "nxn",
      groups: undefined,
      categories: [
        {
          id: "c1",
          name: "Category A",
          items: [{ id: "i2", type: "text", title: "Item X", value: "Item X" }],
        },
      ],
    };
    render(<PackDetailScreen pack={nxnPack} results={RESULTS} />);
    expect(screen.getByText("Category A")).toBeInTheDocument();
    expect(screen.getByText("Item X")).toBeInTheDocument();
    expect(screen.queryByText("2016")).not.toBeInTheDocument();
  });
});
```

`VoteButtons`/`CommentSection` are mocked out because they carry their own `useAuth`/client-fetch dependencies that are irrelevant to what `PackDetailScreen` itself is responsible for (and each already has its own dedicated test file). `PackCoverBanner`/`PackStats` are left real — both are pure/presentational with no hooks.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PackDetailScreen.test.tsx`
Expected: FAIL — `./PackDetailScreen` doesn't exist yet.

- [ ] **Step 3: Create `PackDetailScreen`**

Create `src/features/pack/PackDetailScreen.tsx`:

```tsx
import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { Card } from "@/src/shared/components/Card";
import { buttonClassName } from "@/src/shared/components/Button";
import { PackCoverBanner } from "@/src/features/pack/PackCoverBanner";
import { PackStats } from "@/src/features/pack/PackStats";
import { CommentSection } from "@/src/features/pack/CommentSection";
import { VoteButtons } from "@/src/features/pack/VoteButtons";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

export function PackDetailScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults | RankResults;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
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
      <Text variant="secondary" className="mb-4">
        {pack.description}
      </Text>
      {pack.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {pack.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
      <Link
        href={`/packs/${pack.id}/play`}
        className={buttonClassName("primary", "mb-6 w-fit")}
      >
        Play
      </Link>

      <Text as="h2" variant="title" className="mb-3 text-lg">
        Stats
      </Text>
      <div className="mb-8">
        <PackStats results={results} />
      </div>

      <div className="flex flex-col gap-4">
        {(pack.format === "nxn" ? pack.categories : pack.groups)?.map(
          (section) => (
            <Card
              key={section.id}
              className="hover:translate-y-0 hover:shadow-none"
            >
              <Text className="mb-2 font-semibold">{section.name}</Text>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <Text variant="secondary" className="text-sm">
                      {item.title}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          ),
        )}
      </div>

      <div className="mt-10">
        <CommentSection packId={pack.id} />
      </div>
    </main>
  );
}
```

This is byte-for-byte the JSX currently inlined in `app/packs/[id]/page.tsx`, just moved into its own component.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PackDetailScreen.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Update `page.tsx` to use it**

Replace `app/packs/[id]/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? pack.title : "Pack not found" };
}

export default async function PackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();
  const results = await getResultsServer(id);
  return <PackDetailScreen pack={pack} results={results} />;
}
```

Again a pure extraction — behavior unchanged, fallback wiring happens in Task 8.

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/features/pack/PackDetailScreen.tsx src/features/pack/PackDetailScreen.test.tsx "app/packs/[id]/page.tsx"
git commit -m "refactor: extract PackDetailScreen out of packs/[id]/page.tsx"
```

---

### Task 4: `usePackFallback` hook

**Files:**

- Create: `src/shared/hooks/use-pack-fallback.ts`
- Test: `src/shared/hooks/use-pack-fallback.test.ts`

This is the core retry logic all three fallback wrappers (Tasks 5-7) will use.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/hooks/use-pack-fallback.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePackFallback } from "./use-pack-fallback";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/plays-client");

const mockedUseAuth = vi.mocked(useAuth);
const mockedPacksClient = vi.mocked(packsClient);
const mockedPlaysClient = vi.mocked(playsClient);

function mockAuthStatus(
  status: "loading" | "authenticated" | "unauthenticated",
) {
  mockedUseAuth.mockReturnValue({
    user: null,
    status,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

const PACK: Pack = {
  id: "p1",
  title: "Test Pack",
  description: "",
  coverTone: "#000",
  format: "save_one",
  tags: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("usePackFallback", () => {
  beforeEach(() => vi.resetAllMocks());

  it("stays loading and does not fetch while auth status is still loading", () => {
    mockAuthStatus("loading");
    const { result } = renderHook(() =>
      usePackFallback("p1", { needsResults: false }),
    );
    expect(result.current).toEqual({ status: "loading" });
    expect(mockedPacksClient.getById).not.toHaveBeenCalled();
  });

  it("resolves to notfound without fetching when the viewer is unauthenticated", async () => {
    mockAuthStatus("unauthenticated");
    const { result } = renderHook(() =>
      usePackFallback("p1", { needsResults: false }),
    );
    await waitFor(() => expect(result.current).toEqual({ status: "notfound" }));
    expect(mockedPacksClient.getById).not.toHaveBeenCalled();
  });

  it("resolves to ready with the pack when authenticated and needsResults is false", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockResolvedValue(PACK);
    const { result } = renderHook(() =>
      usePackFallback("p1", { needsResults: false }),
    );
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ready",
        pack: PACK,
        results: null,
      }),
    );
    expect(mockedPlaysClient.getResults).not.toHaveBeenCalled();
  });

  it("resolves to ready with pack and results when authenticated and needsResults is true", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockResolvedValue(PACK);
    mockedPlaysClient.getResults.mockResolvedValue(RESULTS);
    const { result } = renderHook(() =>
      usePackFallback("p1", { needsResults: true }),
    );
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ready",
        pack: PACK,
        results: RESULTS,
      }),
    );
  });

  it("resolves to notfound when the authenticated retry itself 404s", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockRejectedValue(
      new ApiError(404, "Not Found", null),
    );
    const { result } = renderHook(() =>
      usePackFallback("p1", { needsResults: false }),
    );
    await waitFor(() => expect(result.current).toEqual({ status: "notfound" }));
  });

  it("resolves to notfound when the pack fetch succeeds but the results fetch fails", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockResolvedValue(PACK);
    mockedPlaysClient.getResults.mockRejectedValue(
      new ApiError(404, "Not Found", null),
    );
    const { result } = renderHook(() =>
      usePackFallback("p1", { needsResults: true }),
    );
    await waitFor(() => expect(result.current).toEqual({ status: "notfound" }));
  });

  it("does not update state after unmounting before the fetch resolves", async () => {
    mockAuthStatus("authenticated");
    let resolveGetById!: (pack: Pack) => void;
    mockedPacksClient.getById.mockReturnValue(
      new Promise((resolve) => {
        resolveGetById = resolve;
      }),
    );
    const { unmount } = renderHook(() =>
      usePackFallback("p1", { needsResults: false }),
    );
    unmount();
    resolveGetById(PACK);
    // If the cancelled-guard were missing, resolving after unmount would
    // trigger a React "state update on an unmounted component" violation.
    await new Promise((r) => setTimeout(r, 0));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- use-pack-fallback.test.ts`
Expected: FAIL — `./use-pack-fallback` doesn't exist yet.

- [ ] **Step 3: Implement the hook**

Create `src/shared/hooks/use-pack-fallback.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

export type PackFallbackState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; pack: Pack; results: PackResults | RankResults | null };

/**
 * Retries a pack (and optionally its results) as the authenticated viewer,
 * for the case where the Server Component's anonymous fetch already
 * returned null. Never 404s while auth is still resolving, and never
 * attempts the retry at all for an unauthenticated viewer (that always
 * fails the same way the anonymous SSR fetch already did).
 */
export function usePackFallback(
  packId: string,
  opts: { needsResults: boolean },
): PackFallbackState {
  const { status: authStatus } = useAuth();
  const [state, setState] = useState<PackFallbackState>({ status: "loading" });

  useEffect(() => {
    if (authStatus === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (authStatus === "unauthenticated") {
      setState({ status: "notfound" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    packsClient
      .getById(packId)
      .then(async (pack) => {
        if (!opts.needsResults) return { pack, results: null };
        const results = await playsClient.getResults(packId);
        return { pack, results };
      })
      .then(({ pack, results }) => {
        if (cancelled) return;
        setState({ status: "ready", pack, results });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "notfound" });
      });

    return () => {
      cancelled = true;
    };
    // opts.needsResults is a caller-supplied constant for a given fallback
    // component, not reactive state — omitted from deps deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, authStatus]);

  return state;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- use-pack-fallback.test.ts`
Expected: PASS (7/7).

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/shared/hooks/use-pack-fallback.ts src/shared/hooks/use-pack-fallback.test.ts
git commit -m "feat: add usePackFallback hook for authenticated pack-visibility retry"
```

---

### Task 5: `PackDetailFallback`

**Files:**

- Create: `src/features/pack/PackDetailFallback.tsx`
- Test: `src/features/pack/PackDetailFallback.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/pack/PackDetailFallback.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { notFound } from "next/navigation";
import { PackDetailFallback } from "./PackDetailFallback";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/shared/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/src/features/pack/VoteButtons", () => ({
  VoteButtons: () => <div>VoteButtons</div>,
}));
vi.mock("@/src/features/pack/CommentSection", () => ({
  CommentSection: () => <div>CommentSection</div>,
}));

const mockedUsePackFallback = vi.mocked(usePackFallback);
const mockedNotFound = vi.mocked(notFound);

const PACK: Pack = {
  id: "p1",
  title: "Pending Pack",
  description: "desc",
  coverTone: "#000",
  format: "save_one",
  tags: [],
  groups: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};
const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("PackDetailFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the pack once the fallback resolves to ready", () => {
    mockedUsePackFallback.mockReturnValue({
      status: "ready",
      pack: PACK,
      results: RESULTS,
    });
    render(<PackDetailFallback packId="p1" />);
    expect(screen.getByText("Pending Pack")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the fallback is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<PackDetailFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the fallback resolves to notfound", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<PackDetailFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });
});
```

Note: add `beforeEach` import from `vitest` alongside the existing `describe, it, expect, vi` import.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- PackDetailFallback.test.tsx`
Expected: FAIL — `./PackDetailFallback` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/features/pack/PackDetailFallback.tsx`:

```tsx
"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";

export function PackDetailFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: true });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <PackDetailScreen pack={state.pack} results={state.results!} />;
}
```

`notFound()` is called here, synchronously during render once `state.status` is `"notfound"` — never inside the hook's own `.catch()` — because `notFound()` throws a sentinel that only React's render-phase error handling (and the App Router's not-found boundary) reliably catches. Thrown from a promise callback it would just become an unhandled rejection.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- PackDetailFallback.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/features/pack/PackDetailFallback.tsx src/features/pack/PackDetailFallback.test.tsx
git commit -m "feat: add PackDetailFallback client-side auth retry"
```

---

### Task 6: `PlayFallback`

**Files:**

- Create: `src/features/play/PlayFallback.tsx`
- Test: `src/features/play/PlayFallback.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/play/PlayFallback.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import { PlayFallback } from "./PlayFallback";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/src/features/play/PlayRouter", () => ({
  PlayRouter: () => <div>PlayRouter</div>,
}));

const mockedUsePackFallback = vi.mocked(usePackFallback);
const mockedNotFound = vi.mocked(notFound);

const PACK: Pack = {
  id: "p1",
  title: "Pending Pack",
  description: "",
  coverTone: "#000",
  format: "save_one",
  tags: [],
  groups: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("PlayFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders PlayRouter once the fallback resolves to ready", () => {
    mockedUsePackFallback.mockReturnValue({
      status: "ready",
      pack: PACK,
      results: null,
    });
    render(<PlayFallback packId="p1" />);
    expect(screen.getByText("PlayRouter")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the fallback is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<PlayFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the fallback resolves to notfound", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<PlayFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- PlayFallback.test.tsx`
Expected: FAIL — `./PlayFallback` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/features/play/PlayFallback.tsx`:

```tsx
"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { PlayRouter } from "@/src/features/play/PlayRouter";

export function PlayFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: false });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <PlayRouter pack={state.pack} />;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- PlayFallback.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/features/play/PlayFallback.tsx src/features/play/PlayFallback.test.tsx
git commit -m "feat: add PlayFallback client-side auth retry"
```

---

### Task 7: `ResultFallback`

**Files:**

- Create: `src/features/result/ResultFallback.tsx`
- Test: `src/features/result/ResultFallback.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/result/ResultFallback.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import { ResultFallback } from "./ResultFallback";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/shared/hooks/use-pack-fallback");
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/src/features/result/ResultScreen", () => ({
  ResultScreen: () => <div>ResultScreen</div>,
}));

const mockedUsePackFallback = vi.mocked(usePackFallback);
const mockedNotFound = vi.mocked(notFound);

const PACK: Pack = {
  id: "p1",
  title: "Pending Pack",
  description: "",
  coverTone: "#000",
  format: "save_one",
  tags: [],
  groups: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};
const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("ResultFallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders ResultScreen once the fallback resolves to ready", () => {
    mockedUsePackFallback.mockReturnValue({
      status: "ready",
      pack: PACK,
      results: RESULTS,
    });
    render(<ResultFallback packId="p1" />);
    expect(screen.getByText("ResultScreen")).toBeInTheDocument();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("renders nothing while the fallback is loading", () => {
    mockedUsePackFallback.mockReturnValue({ status: "loading" });
    const { container } = render(<ResultFallback packId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls notFound when the fallback resolves to notfound", () => {
    mockedUsePackFallback.mockReturnValue({ status: "notfound" });
    render(<ResultFallback packId="p1" />);
    expect(mockedNotFound).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ResultFallback.test.tsx`
Expected: FAIL — `./ResultFallback` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `src/features/result/ResultFallback.tsx`:

```tsx
"use client";

import { notFound } from "next/navigation";
import { usePackFallback } from "@/src/shared/hooks/use-pack-fallback";
import { ResultScreen } from "@/src/features/result/ResultScreen";

export function ResultFallback({ packId }: { packId: string }) {
  const state = usePackFallback(packId, { needsResults: true });

  if (state.status === "notfound") notFound();
  if (state.status !== "ready") return null;

  return <ResultScreen pack={state.pack} results={state.results!} />;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ResultFallback.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/features/result/ResultFallback.tsx src/features/result/ResultFallback.test.tsx
git commit -m "feat: add ResultFallback client-side auth retry"
```

---

### Task 8: Wire the fallbacks into all three pages + robots mitigation

**Files:**

- Modify: `app/packs/[id]/page.tsx`
- Modify: `app/packs/[id]/play/page.tsx`
- Modify: `app/packs/[id]/result/page.tsx`

This is the task that actually changes user-visible behavior — everything before this point was pure extraction/addition with no behavior change.

- [ ] **Step 1: Update `app/packs/[id]/page.tsx`**

Replace with:

```tsx
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { PackDetailScreen } from "@/src/features/pack/PackDetailScreen";
import { PackDetailFallback } from "@/src/features/pack/PackDetailFallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack)
    return { title: "Pack not found", robots: { index: false, follow: false } };
  return { title: pack.title };
}

export default async function PackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <PackDetailFallback packId={id} />;
  const results = await getResultsServer(id);
  return <PackDetailScreen pack={pack} results={results} />;
}
```

Note `notFound` is no longer imported here — the null branch now delegates to `PackDetailFallback` instead of 404ing immediately. The `robots: { index: false, follow: false }` addition (mirroring the same pattern already used in `app/admin/page.tsx`) keeps a genuinely-deleted pack's soft-404 shell out of search results, since crawlers are always anonymous and therefore always hit this branch for anything non-public.

- [ ] **Step 2: Update `app/packs/[id]/play/page.tsx`**

Replace with:

```tsx
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayRouter } from "@/src/features/play/PlayRouter";
import { PlayFallback } from "@/src/features/play/PlayFallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack)
    return { title: "Pack not found", robots: { index: false, follow: false } };
  return { title: `Playing ${pack.title}` };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <PlayFallback packId={id} />;
  return <PlayRouter pack={pack} />;
}
```

- [ ] **Step 3: Update `app/packs/[id]/result/page.tsx`**

Replace with:

```tsx
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { getResultsServer } from "@/src/shared/lib/get-results-server";
import { ResultScreen } from "@/src/features/result/ResultScreen";
import { ResultFallback } from "@/src/features/result/ResultFallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack)
    return { title: "Pack not found", robots: { index: false, follow: false } };
  return { title: `${pack.title} — Result` };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) return <ResultFallback packId={id} />;
  const results = await getResultsServer(id);
  return <ResultScreen pack={pack} results={results} />;
}
```

There's no dedicated unit test for these three page files (no existing precedent for page-level tests in this repo, and the actual branching logic they now delegate to is already fully covered by Tasks 4-7's tests) — this task's correctness is verified by the full suite plus Task 9's manual browser check.

- [ ] **Step 4: Run the full test suite, typecheck, and lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add "app/packs/[id]/page.tsx" "app/packs/[id]/play/page.tsx" "app/packs/[id]/result/page.tsx"
git commit -m "fix: retry as the authenticated viewer before 404ing a non-public pack (#66)"
```

---

### Task 9: Verify + whole-branch review + manual verification + PR + merge

- [ ] **Step 1: Full verification**

Run: `npm test && npm run test:e2e && npm run typecheck && npm run lint`
Expected: all green. (No new e2e spec was added in this plan — see the design doc's testing section for why `page.route()` can't exercise this fix; the existing e2e suite should simply still pass unchanged.)

- [ ] **Step 2: Whole-branch review**

Dispatch `pr-review-toolkit:code-reviewer` against the full diff of `fix/pack-ssr-auth-fallback` vs `develop`. Fix any Important+ findings and re-run Step 1.

- [ ] **Step 3: Manual browser verification**

Against the live backend (both dev servers running):

1. Log in as a plain `user`-role test account. Create a pack — it lands `pending` (assuming that account isn't marked `trusted`).
2. While still logged in as that same account (the pack's owner), navigate directly to `/packs/[id]` (typed URL / hard reload, not a client-side navigation from within the app) and confirm the pack's real title and content render — not "Pack not found". Repeat for `/packs/[id]/play` and `/packs/[id]/result` (the latter may show "0 plays" — that's fine, the point is confirming it renders instead of 404ing).
3. Log out, log in as a _different_ plain `user`-role account (not the owner, not moderator+), and confirm the same pending pack's `/packs/[id]` URL now correctly 404s (no over-broad disclosure).
4. Log in as a moderator+ test account and confirm the same pending pack also renders correctly for them via direct URL.
5. From the moderator's Admin → Moderation queue, click "View" on that pending pack and confirm it no longer 404s. From the owner's Profile → My Packs, click into the same pending pack's card and confirm the same.

- [ ] **Step 4: Push, open PR against `develop`, merge**

```bash
git push -u origin fix/pack-ssr-auth-fallback
```

Open a PR titled something like "Retry as authenticated viewer before 404ing a non-public pack (fixes #66)" against `develop`. Include `Closes #66` in the body — note this repo's issues only auto-close on merge to `main`, so also plan to close #66 manually with a comment after merging, per this repo's established practice. Merge once green (per this repo's `develop`-not-`main` workflow and the user's standing authorization to merge Claude-authored PRs without asking each time).
