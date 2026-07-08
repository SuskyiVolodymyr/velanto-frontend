# Author Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public creator profile at `/users/[id]` (velanto-frontend#27) — author header, follower stats, follow/unfollow, packs grid, and a moderator+-only ban history + ban button.

**Architecture:** One client component `AuthorScreen.tsx` (mirrors `ProfileScreen.tsx`'s shape: fetch-on-mount, sequential loading-state guards), fed by three new `usersClient` methods. A thin Server Component route wrapper at `app/users/[id]/page.tsx`. `BAN_DURATIONS` extracted out of `UsersTab.tsx` into a shared module so both the admin panel and this screen use the same list.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

**Design doc:** `docs/superpowers/specs/2026-07-08-author-screen-design.md`

---

### Task 1: Shared `BAN_DURATIONS` + `usersClient` additions

**Files:**
- Create: `src/shared/lib/ban-durations.ts`
- Modify: `src/features/admin/UsersTab.tsx` (remove local `BAN_DURATIONS`, import shared one)
- Modify: `src/shared/lib/users-client.ts`
- Test: `src/shared/lib/users-client.test.ts`

- [ ] **Step 1: Write the failing tests for the new client methods**

Read `src/shared/lib/users-client.test.ts` first to match its existing mocking pattern (it mocks `apiClient`), then add:

```ts
describe("usersClient.follow", () => {
  it("POSTs to /users/:id/follow", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ followerCount: 5 });
    const result = await usersClient.follow("user-1");
    expect(postSpy).toHaveBeenCalledWith("/users/user-1/follow");
    expect(result).toEqual({ followerCount: 5 });
  });
});

describe("usersClient.unfollow", () => {
  it("POSTs to /users/:id/unfollow", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ followerCount: 4 });
    const result = await usersClient.unfollow("user-1");
    expect(postSpy).toHaveBeenCalledWith("/users/user-1/unfollow");
    expect(result).toEqual({ followerCount: 4 });
  });
});

describe("usersClient.banHistory", () => {
  it("GETs /users/:id/ban-history with page/limit query params", async () => {
    const page = {
      items: [{ actorUsername: "mod1", meta: { duration: "week", reason: "spam" }, createdAt: "2026-01-01T00:00:00.000Z" }],
      total: 1,
      page: 1,
      limit: 20,
    };
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(page);
    const result = await usersClient.banHistory("user-1", { page: 1, limit: 20 });
    expect(getSpy).toHaveBeenCalledWith("/users/user-1/ban-history?page=1&limit=20");
    expect(result).toEqual(page);
  });

  it("omits query params when not provided", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    await usersClient.banHistory("user-1");
    expect(getSpy).toHaveBeenCalledWith("/users/user-1/ban-history");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- users-client`
Expected: FAIL — `usersClient.follow`/`unfollow`/`banHistory` are not functions.

- [ ] **Step 3: Extract `BAN_DURATIONS` into a shared module**

Create `src/shared/lib/ban-durations.ts`:

```ts
import type { BanDuration } from "@/src/shared/lib/users-client";

export const BAN_DURATIONS: { value: BanDuration; label: string }[] = [
  { value: "week", label: "1 week" },
  { value: "month", label: "1 month" },
  { value: "year", label: "1 year" },
  { value: "forever", label: "Forever" },
];
```

In `src/features/admin/UsersTab.tsx`, remove the local `const BAN_DURATIONS = [...]` block and its now-unused `BanDuration` import from `users-client` (keep the import if still used elsewhere in the file for typing `banDuration` state — check before removing), and add:

```ts
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
```

- [ ] **Step 4: Add the three methods + type to `users-client.ts`**

In `src/shared/lib/users-client.ts`, add after the existing `ChangeRoleResult` interface:

```ts
export interface BanHistoryEntry {
  actorUsername: string;
  meta: { duration: string; reason: string };
  createdAt: string;
}

export interface BanHistoryPage {
  items: BanHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}
```

Add to the `usersClient` object:

```ts
  follow: (id: string) => apiClient.post<{ followerCount: number }>(`/users/${id}/follow`),
  unfollow: (id: string) => apiClient.post<{ followerCount: number }>(`/users/${id}/unfollow`),
  banHistory: (id: string, params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiClient.get<BanHistoryPage>(`/users/${id}/ban-history${qs ? `?${qs}` : ""}`);
  },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- users-client`
Expected: PASS, all cases including pre-existing ones.

- [ ] **Step 6: Run typecheck (UsersTab.tsx's import change must not break it)**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/shared/lib/ban-durations.ts src/shared/lib/users-client.ts src/shared/lib/users-client.test.ts src/features/admin/UsersTab.tsx
git commit -m "feat: add follow/unfollow/banHistory to usersClient, extract BAN_DURATIONS"
```

---

### Task 2: `AuthorScreen` — header, stats, follow, packs grid

**Files:**
- Create: `src/features/author/AuthorScreen.tsx`
- Test: `src/features/author/AuthorScreen.test.tsx`

This mirrors `ProfileScreen.tsx`'s guard-ordering pattern exactly (see `src/features/profile/ProfileScreen.tsx`) — **this codebase has twice shipped a permanent-blank-screen bug from OR'ing an auth-loading guard with a local fetch-loading guard.** Guards must be separate and sequential, in this exact order: profile-load error/not-found → success render. (Unlike ProfileScreen, `authStatus` here is NOT a blocking gate — an anonymous viewer can view any author's page, they just don't get a working Follow button.)

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthorScreen } from "./AuthorScreen";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/auth-context");

const mockedUsersClient = vi.mocked(usersClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedUseAuth = vi.mocked(useAuth);

const profile = {
  id: "author-1",
  username: "quizmaster",
  bio: "I make packs",
  createdAt: "2026-01-01T00:00:00.000Z",
  followerCount: 3,
  isFollowedByMe: false,
};

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockedUseAuth.mockReturnValue({
    user: { id: "viewer-1", email: "v@x.com", username: "viewer", role: "user", createdAt: "" },
    status: "authenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

describe("AuthorScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedPacksClient.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
  });

  it("renders the author's username, bio, and follower count", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(screen.getByText("I make packs")).toBeInTheDocument();
    expect(screen.getByText("3 followers")).toBeInTheDocument();
  });

  it("shows a not-found message when the profile 404s", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockRejectedValue(new Error("404"));
    render(<AuthorScreen authorId="missing" />);
    await waitFor(() => expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument());
  });

  it("hides the Follow button when viewing your own author page", async () => {
    mockAuth({ user: { id: "author-1", email: "a@x.com", username: "quizmaster", role: "user", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /follow/i })).not.toBeInTheDocument();
  });

  it("toggles Follow to Following and updates the follower count on click", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.follow.mockResolvedValue({ followerCount: 4 });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument());
    expect(screen.getByText("4 followers")).toBeInTheDocument();
  });

  it("does not flip the button state when the follow request fails", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.follow.mockRejectedValue(new Error("network"));
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() => expect(screen.getByText(/couldn't update/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
  });

  it("redirects an anonymous viewer to /auth on Follow click instead of calling the API", async () => {
    const push = vi.fn();
    vi.doMock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/users/author-1" }));
    mockAuth({ user: null, status: "unauthenticated" });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(mockedUsersClient.follow).not.toHaveBeenCalled();
  });

  it("renders the author's approved packs in a grid without status badges", async () => {
    mockAuth();
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedPacksClient.list.mockResolvedValue({
      items: [
        {
          id: "pack-1",
          title: "Anime Showdown",
          description: "d",
          coverTone: "#111",
          format: "save_one",
          tags: [],
          authorId: "author-1",
          status: "approved",
          rejectionReason: null,
          totalPlays: 0,
          avgAgreementPercent: 0,
          groups: [],
        } as never,
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("Anime Showdown")).toBeInTheDocument());
    expect(mockedPacksClient.list).toHaveBeenCalledWith({ authorId: "author-1", limit: 50 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AuthorScreen`
Expected: FAIL — module `./AuthorScreen` doesn't exist.

- [ ] **Step 3: Implement `AuthorScreen.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PackCard } from "@/src/features/home/PackCard";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

export function AuthorScreen({ authorId }: { authorId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([usersClient.getProfile(authorId), packsClient.list({ authorId, limit: 50 })])
      .then(([profileResult, packsResult]) => {
        if (cancelled) return;
        setProfile(profileResult);
        setPacks(packsResult.items);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  async function handleFollowToggle() {
    if (authStatus !== "authenticated") {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!profile) return;
    setFollowBusy(true);
    setFollowError("");
    try {
      const result = profile.isFollowedByMe
        ? await usersClient.unfollow(authorId)
        : await usersClient.follow(authorId);
      setProfile({ ...profile, isFollowedByMe: !profile.isFollowedByMe, followerCount: result.followerCount });
    } catch {
      setFollowError("Couldn't update follow status. Try again.");
    } finally {
      setFollowBusy(false);
    }
  }

  if (status === "loading") return null;

  if (status === "error" || !profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">This user doesn&apos;t exist.</Text>
      </div>
    );
  }

  const initial = profile.username.slice(0, 1).toUpperCase();
  const isOwnProfile = authStatus === "authenticated" && user?.id === authorId;

  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xl font-semibold text-foreground-secondary">
            {initial}
          </div>
          <div>
            <Text as="h1" variant="title" className="text-2xl">
              {profile.username}
            </Text>
            <Text variant="tertiary" className="text-sm">
              {profile.followerCount} follower{profile.followerCount === 1 ? "" : "s"} · {packs.length} pack
              {packs.length === 1 ? "" : "s"}
            </Text>
          </div>
        </div>
        {!isOwnProfile && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant={profile.isFollowedByMe ? "secondary" : "primary"}
              disabled={followBusy}
              onClick={() => void handleFollowToggle()}
            >
              {profile.isFollowedByMe ? "Following" : "Follow"}
            </Button>
            {followError && <Text className="text-xs text-[#ff6b6b]">{followError}</Text>}
          </div>
        )}
      </div>

      {profile.bio && (
        <div className="mb-10">
          <Text variant="secondary">{profile.bio}</Text>
        </div>
      )}

      <Text as="h2" variant="title" className="mb-4 text-lg">
        Packs
      </Text>
      {packs.length === 0 ? (
        <Text variant="secondary">No packs yet.</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AuthorScreen`
Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/author/AuthorScreen.tsx src/features/author/AuthorScreen.test.tsx
git commit -m "feat: add AuthorScreen with header, follow toggle, and packs grid"
```

---

### Task 3: Moderator ban history + ban button

**Files:**
- Modify: `src/features/author/AuthorScreen.tsx`
- Modify: `src/features/author/AuthorScreen.test.tsx`

- [ ] **Step 1: Write the failing tests (append to the existing describe block)**

```tsx
  it("does not show ban history or a ban button to a plain-user viewer", async () => {
    mockAuth({ user: { id: "viewer-1", email: "v@x.com", username: "viewer", role: "user", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(mockedUsersClient.banHistory).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^ban$/i })).not.toBeInTheDocument();
  });

  it("shows ban history and a ban button to a moderator viewer", async () => {
    mockAuth({ user: { id: "mod-1", email: "m@x.com", username: "mod", role: "moderator", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockResolvedValue({
      items: [{ actorUsername: "mod2", meta: { duration: "week", reason: "spam" }, createdAt: "2026-01-01T00:00:00.000Z" }],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(mockedUsersClient.banHistory).toHaveBeenCalledWith("author-1", { page: 1, limit: 20 });
    await waitFor(() => expect(screen.getByText(/spam/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^ban$/i })).toBeInTheDocument();
  });

  it("shows an empty-state message when the author has no ban history", async () => {
    mockAuth({ user: { id: "mod-1", email: "m@x.com", username: "mod", role: "moderator", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText(/no ban history/i)).toBeInTheDocument());
  });

  it("hides ban history and the ban button when a moderator views their own page", async () => {
    mockAuth({ user: { id: "author-1", email: "a@x.com", username: "quizmaster", role: "moderator", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByText("quizmaster")).toBeInTheDocument());
    expect(mockedUsersClient.banHistory).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^ban$/i })).not.toBeInTheDocument();
  });

  it("submits a ban via the inline form and shows the updated status", async () => {
    mockAuth({ user: { id: "mod-1", email: "m@x.com", username: "mod", role: "moderator", createdAt: "" } });
    mockedUsersClient.getProfile.mockResolvedValue(profile);
    mockedUsersClient.banHistory.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    mockedUsersClient.ban.mockResolvedValue({ id: "author-1", bannedUntil: "2027-01-01T00:00:00.000Z" });
    render(<AuthorScreen authorId="author-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^ban$/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /^ban$/i }));
    await userEvent.type(screen.getByLabelText(/ban reason/i), "repeated spam");
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() => expect(mockedUsersClient.ban).toHaveBeenCalledWith("author-1", { duration: "week", reason: "repeated spam" }));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AuthorScreen`
Expected: FAIL — no ban history/ban button rendered yet.

- [ ] **Step 3: Extend `AuthorScreen.tsx`**

Add imports:

```ts
import { Input } from "@/src/shared/components/Input";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import type { BanDuration, BanHistoryEntry } from "@/src/shared/lib/users-client";
```

Add state (inside the component, alongside existing state):

```ts
const [banHistory, setBanHistory] = useState<BanHistoryEntry[]>([]);
const [banHistoryStatus, setBanHistoryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
const [showBanForm, setShowBanForm] = useState(false);
const [banDuration, setBanDuration] = useState<BanDuration>("week");
const [banReason, setBanReason] = useState("");
const [banActionError, setBanActionError] = useState("");
const [bannedUntil, setBannedUntil] = useState<string | null>(null);

const isModeratorPlus = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";
const isOwnProfile = authStatus === "authenticated" && user?.id === authorId;
const showModeratorTools = isModeratorPlus && !isOwnProfile;
```

Note: `isOwnProfile` already exists from Task 2 — don't redeclare it, just add `showModeratorTools` below it.

Add a second effect, gated on the profile having loaded and the viewer qualifying:

```ts
useEffect(() => {
  if (status !== "ready" || !showModeratorTools) return;
  let cancelled = false;
  setBanHistoryStatus("loading");
  usersClient
    .banHistory(authorId, { page: 1, limit: 20 })
    .then((result) => {
      if (cancelled) return;
      setBanHistory(result.items);
      setBanHistoryStatus("ready");
    })
    .catch(() => {
      if (cancelled) return;
      setBanHistoryStatus("error");
    });
  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [status, showModeratorTools, authorId]);

async function handleBanSubmit() {
  if (!banReason.trim()) return;
  setBanActionError("");
  try {
    const result = await usersClient.ban(authorId, { duration: banDuration, reason: banReason.trim() });
    setBannedUntil(result.bannedUntil);
    setShowBanForm(false);
    setBanReason("");
  } catch {
    setBanActionError("Couldn't ban this user. Try again.");
  }
}
```

Add JSX before the closing `</div>` of the packs section (i.e. after the bio block, before "Packs" heading — matches the design doc's section order: header → bio → follow already rendered → ban history → ban button → packs grid):

```tsx
{showModeratorTools && (
  <div className="mb-10 rounded-[15px] border border-border bg-surface p-4">
    <div className="mb-3 flex items-center justify-between">
      <Text as="h2" variant="title" className="text-lg">
        Moderation
      </Text>
      {!bannedUntil && (
        <Button variant="secondary" onClick={() => setShowBanForm((v) => !v)}>
          Ban
        </Button>
      )}
    </div>
    {bannedUntil && <Text variant="secondary" className="mb-3 text-sm">Banned until {new Date(bannedUntil).toLocaleDateString()}.</Text>}
    {showBanForm && (
      <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border pb-4">
        <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
          Duration
          <select
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value as BanDuration)}
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
        <Button variant="primary" disabled={!banReason.trim()} onClick={() => void handleBanSubmit()}>
          Confirm ban
        </Button>
        {banActionError && <Text className="text-xs text-[#ff6b6b]">{banActionError}</Text>}
      </div>
    )}
    {banHistoryStatus === "loading" && <Text variant="secondary">Loading ban history…</Text>}
    {banHistoryStatus === "error" && <Text className="text-sm text-[#ff6b6b]">Couldn&apos;t load ban history.</Text>}
    {banHistoryStatus === "ready" && banHistory.length === 0 && (
      <Text variant="secondary">No ban history for this user.</Text>
    )}
    {banHistoryStatus === "ready" && banHistory.length > 0 && (
      <div className="flex flex-col gap-2">
        {banHistory.map((entry, i) => (
          <div key={i} className="text-sm">
            <Text variant="tertiary" className="text-xs">
              {new Date(entry.createdAt).toLocaleString()}
            </Text>
            <Text>
              <span className="font-semibold">{entry.actorUsername}</span> · {entry.meta.duration} ·{" "}
              <span className="text-foreground-secondary">{entry.meta.reason}</span>
            </Text>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

`banHistory` entries have no stable id in the API response (`BanHistoryEntry` has no `id` field) — using the array index as `key` here is acceptable since this list is never reordered or filtered client-side, only ever appended to.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AuthorScreen`
Expected: PASS, all cases.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/author/AuthorScreen.tsx src/features/author/AuthorScreen.test.tsx
git commit -m "feat: add moderator ban history and ban button to AuthorScreen"
```

---

### Task 4: Routing + CommentSection author link

**Files:**
- Create: `app/users/[id]/page.tsx`
- Modify: `src/features/pack/CommentSection.tsx`
- Modify: `src/features/pack/CommentSection.test.tsx`

This adds the only currently-available entry point into the Author screen for other users' pages (a moderator needs some way to reach a target author's page to use the new ban button) — read `src/features/pack/CommentSection.tsx` in full before editing, since `Comment` already carries both `authorId` and `authorUsername` (`src/shared/types/comment.ts`), which makes this a small, low-risk change: wrap the existing plain-text username in a `Link`. Disclosed UX addition, not spec creep — the design doc scoped the Author screen's *content* but didn't specify how a viewer navigates to it, since no other in-repo entry point exists yet (`PackCard`/`PackCoverBanner` don't have an author-username field on the backend response to link from — that's a separate, undone backend enhancement, not part of this task).

- [ ] **Step 1: Write the failing route test**

Check whether this repo has route-level tests for other `app/*/page.tsx` files (e.g. `app/profile/page.tsx` — likely no dedicated test file, since Server Component wrappers are thin). If there's no existing precedent for testing thin route wrappers, skip a dedicated test for `page.tsx` and rely on the Playwright e2e/manual browser check in Task 5 instead — don't invent a testing pattern this codebase doesn't use elsewhere.

- [ ] **Step 2: Implement `app/users/[id]/page.tsx`**

```tsx
import { AuthorScreen } from "@/src/features/author/AuthorScreen";

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuthorScreen authorId={id} />;
}
```

- [ ] **Step 3: Write the failing test for the CommentSection link**

In `src/features/pack/CommentSection.test.tsx`, find the existing test that asserts on `comment.authorUsername` rendering (read the file first for the exact mock comment shape used), and add:

```tsx
it("links each comment author's username to their author page", async () => {
  // reuse this file's existing comment-list mock setup, then:
  render(<CommentSection packId="pack-1" />);
  await waitFor(() => expect(screen.getByText("commenter1")).toBeInTheDocument());
  const link = screen.getByRole("link", { name: "commenter1" });
  expect(link).toHaveAttribute("href", "/users/commenter-author-id");
});
```

Adjust `"commenter1"`/`"commenter-author-id"` to match whatever mock comment fixture the existing test file already uses — don't introduce a second, inconsistent fixture.

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- CommentSection`
Expected: FAIL — no link role found, username renders as plain text.

- [ ] **Step 5: Wrap the username in a `Link`**

In `src/features/pack/CommentSection.tsx`, add `import Link from "next/link";` if not already imported (it likely already is, for the "Log in" link), then change:

```tsx
<Text className="text-sm font-semibold">{comment.authorUsername}</Text>
```

to:

```tsx
<Link href={`/users/${comment.authorId}`} className="text-sm font-semibold hover:underline">
  {comment.authorUsername}
</Link>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- CommentSection`
Expected: PASS.

- [ ] **Step 7: Run full test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add "app/users/[id]/page.tsx" src/features/pack/CommentSection.tsx src/features/pack/CommentSection.test.tsx
git commit -m "feat: add /users/[id] route, link comment authors to their author page"
```

---

### Task 5: Verify + review + manual test + PR + merge

- [ ] **Step 1: Full verify sequence**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all green. Fix any failures before proceeding (per this repo's established pattern this session, re-run fresh rather than trusting stale editor diagnostics).

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer`**

Review the full diff of this branch against `develop`. Fix any Critical/Important findings and re-verify (Step 1) after each fix.

- [ ] **Step 3: Manual browser verification (Claude Preview)**

Start both `backend` and `frontend` preview servers. As an anonymous viewer, navigate to `/users/<some-existing-author-id>` and confirm the page renders (header, bio, packs grid, no Follow/ban visible incorrectly). Log in as a plain user and confirm the Follow button works and the follower count updates. Log in as a moderator (or promote a test user via DB) and confirm ban history + ban button render and a ban submission round-trips (skip live-verifying the `ban` POST itself if it 404s/fails for unrelated preview-tooling reasons unrelated to PATCH — `ban` is a POST, so the known PATCH-only preview bug, see `reference_claude_preview_patch_bug.md`, should not apply here; if it does fail, isolate via curl/raw fetch before treating it as a real bug). Confirm clicking a commenter's username on a pack detail page navigates to their author page.

- [ ] **Step 4: Push, open PR, merge**

Follow this repo's standing workflow (`.claude/workflows/pull-request.md`) and the standing autonomous-merge authorization already established this session (own-authored branches only — see the hard rule about never merging third-party PRs, not applicable here since this is entirely my own work). Push the branch, open a PR against `develop` with a summary of what was built, merge once green.

- [ ] **Step 5: Close the GitHub issue**

Manually close velanto-frontend#27 (issues on this repo don't auto-close on merge to `develop`, only to `main` — see `velanto-frontend/CLAUDE.md`).
