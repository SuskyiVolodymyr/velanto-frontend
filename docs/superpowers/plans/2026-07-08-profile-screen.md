# Profile / Profile Edit Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-profile view (`/profile`) showing bio, follower count, and "My Packs" (all statuses, with a pending/rejected badge), plus a bio-only edit screen (`/profile/edit`).

**Architecture:** Both screens are client components (need `useAuth()` for the current user's id) wrapped by thin Server Component page files, matching this repo's existing `SettingsScreen`/`app/settings/page.tsx` convention. Backend API is already fully built and merged: `GET /users/:id`, `PATCH /users/me`, `GET /packs?authorId=`.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, Vitest + React Testing Library.

**Reference:** velanto-frontend#26. Scoping research from earlier tonight already resolved every ambiguity (dropped: "packs played"/"total plays received" stat tiles and "Recently Played" section — no backend data source for either; static initials avatar, no upload UI — backend#3 deferred).

---

### Task 1: Types + API client additions

**Files:**

- Modify: `src/shared/types/pack.ts`
- Modify: `src/shared/types/user.ts`
- Modify: `src/shared/lib/packs-client.ts`
- Modify: `src/shared/lib/packs-client.test.ts`
- Modify: `src/shared/lib/users-client.ts`
- Modify: `src/shared/lib/users-client.test.ts`

- [ ] **Step 1: Add `status`/`rejectionReason` to the `Pack` type**

In `src/shared/types/pack.ts`, add to the `Pack` interface (after `avgAgreementPercent`):

```ts
status: "pending" | "approved" | "rejected";
rejectionReason: string | null;
```

- [ ] **Step 2: Add a `PublicUserProfile` type**

In `src/shared/types/user.ts`, add:

```ts
export interface PublicUserProfile {
  id: string;
  username: string;
  bio: string | null;
  createdAt: string;
  followerCount: number;
  isFollowedByMe: boolean | null;
}
```

- [ ] **Step 3: Write the failing test for `authorId` in `packsClient.list()`**

Read `src/shared/lib/packs-client.test.ts` first to see its exact current structure, then add a test alongside the existing filter-query tests (e.g. near a test that checks `format`/`tags`/`q` end up in the query string):

```ts
it("includes authorId in the query string when provided", async () => {
  mockFetchOnce({ items: [], total: 0, page: 1, limit: 20 });
  await packsClient.list({ authorId: "user-1" });
  const url = getLastFetchUrl();
  expect(url).toContain("authorId=user-1");
});
```

(Adapt the exact mock/assertion helper names to whatever this test file's existing tests already use — e.g. if it mocks `global.fetch` directly rather than via named helpers like `mockFetchOnce`/`getLastFetchUrl`, follow that same pattern instead. Read the file fully before writing this.)

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- packs-client.test.ts`
Expected: FAIL — `authorId` isn't in `ListPacksFilters` yet, so the query string won't contain it (TypeScript would actually reject passing `authorId` at all once you try — that's expected at this stage since the type doesn't have the field yet; adjust step ordering if your test runner surfaces this as a type error before a runtime failure — either way, confirm it doesn't pass yet).

- [ ] **Step 5: Add `authorId` to `ListPacksFilters` and `buildListQuery`**

In `src/shared/lib/packs-client.ts`, add to `ListPacksFilters`:

```ts
  authorId?: string;
```

Add to `buildListQuery`, alongside the existing `if` checks:

```ts
if (filters.authorId) params.set("authorId", filters.authorId);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- packs-client.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing tests for the new `usersClient` methods**

Read `src/shared/lib/users-client.test.ts` first to see its exact existing structure/mocking pattern (it already tests `ban`/`unban`/`changeRole`), then add:

```ts
it("getProfile fetches a user's public profile by id", async () => {
  mockFetchOnce({
    id: "user-1",
    username: "alice",
    bio: "Hello",
    createdAt: "2026-01-01T00:00:00.000Z",
    followerCount: 3,
    isFollowedByMe: null,
  });
  const result = await usersClient.getProfile("user-1");
  expect(result.username).toBe("alice");
  expect(getLastFetchUrl()).toContain("/users/user-1");
});

it("updateProfile PATCHes the caller's own bio", async () => {
  mockFetchOnce({ id: "user-1", bio: "New bio" });
  const result = await usersClient.updateProfile("New bio");
  expect(result.bio).toBe("New bio");
  expect(getLastFetchUrl()).toContain("/users/me");
  expect(getLastFetchMethod()).toBe("PATCH");
});
```

(Again, adapt exact mock-helper names to this file's real existing pattern — read it first.)

- [ ] **Step 8: Run tests to verify they fail**

Run: `npm test -- users-client.test.ts`
Expected: FAIL — `getProfile`/`updateProfile` don't exist yet.

- [ ] **Step 9: Implement `getProfile`/`updateProfile`**

In `src/shared/lib/users-client.ts`, add the import:

```ts
import type { PublicUserProfile } from "@/src/shared/types/user";
```

Add to the `usersClient` object:

```ts
  getProfile: (id: string) => apiClient.get<PublicUserProfile>(`/users/${id}`),
  updateProfile: (bio: string) =>
    apiClient.patch<{ id: string; bio: string }>("/users/me", { bio }),
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test -- users-client.test.ts`
Expected: PASS.

- [ ] **Step 11: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS. (`Pack`'s widened shape may surface type errors in other files that construct `Pack`-shaped test fixtures — same class of issue the backend hit earlier tonight. Fix any fixture that's missing `status`/`rejectionReason` by adding `status: "approved", rejectionReason: null` to it, matching the backend's precedent of using `"approved"` as the sensible default for fixtures representing normal, already-live packs.)

- [ ] **Step 12: Commit**

```bash
git add src/shared/types/pack.ts src/shared/types/user.ts src/shared/lib/packs-client.ts src/shared/lib/packs-client.test.ts src/shared/lib/users-client.ts src/shared/lib/users-client.test.ts
git commit -m "feat: add authorId pack filter and user profile API client methods"
```

(If Step 11 required fixing other fixture files, include those in this commit too.)

---

### Task 2: `ProfileScreen` component (self-view)

**Files:**

- Create: `src/features/profile/ProfileScreen.tsx`
- Create: `src/features/profile/ProfileScreen.test.tsx`
- Modify: `src/features/home/PackCard.tsx`
- Modify: `src/features/home/PackCard.test.tsx`

- [ ] **Step 1: Write the failing test for `PackCard`'s status badge**

Read `src/features/home/PackCard.test.tsx` first, then add:

```tsx
it("shows a pending badge when showStatus is true and the pack is pending", () => {
  render(<PackCard pack={{ ...SAMPLE_PACK, status: "pending" }} showStatus />);
  expect(screen.getByText("Pending review")).toBeInTheDocument();
});

it("shows a rejected badge when showStatus is true and the pack is rejected", () => {
  render(<PackCard pack={{ ...SAMPLE_PACK, status: "rejected" }} showStatus />);
  expect(screen.getByText("Rejected")).toBeInTheDocument();
});

it("shows no status badge when showStatus is true but the pack is approved", () => {
  render(<PackCard pack={{ ...SAMPLE_PACK, status: "approved" }} showStatus />);
  expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
});

it("shows no status badge when showStatus is not passed, even for a pending pack", () => {
  render(<PackCard pack={{ ...SAMPLE_PACK, status: "pending" }} />);
  expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
});
```

(Use whatever this test file's existing sample-pack fixture is named — likely `SAMPLE_PACK` or similar; read the file to confirm the exact name and its shape, and make sure it already includes `status: "approved"` per Task 1's fixture-update step, or add it now if this is the fixture that needed updating.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- PackCard.test.tsx`
Expected: FAIL — `PackCard` doesn't accept a `showStatus` prop yet.

- [ ] **Step 3: Add the status badge to `PackCard`**

In `src/features/home/PackCard.tsx`, change the function signature and add the badge:

```tsx
export function PackCard({ pack, showStatus }: { pack: Pack; showStatus?: boolean }) {
  const roundsCount = getRoundsCount(pack);
  const statsLabel =
    pack.totalPlays === 0
      ? "No plays yet"
      : `${pack.totalPlays} play${pack.totalPlays === 1 ? "" : "s"} · ${Math.round(pack.avgAgreementPercent)}% agreement`;
  const statusBadge =
    showStatus && pack.status !== "approved"
      ? { label: pack.status === "pending" ? "Pending review" : "Rejected", tone: pack.status }
      : null;

  return (
    <Link href={`/packs/${pack.id}`} className="block">
      <div className="flex h-full flex-col overflow-hidden rounded-[15px] border border-border bg-surface transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(0,0,0,0.42)]">
        <div
          className="flex aspect-[4/3] items-end justify-between p-4"
          style={{ background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)` }}
        >
          <Badge>{FORMAT_LABELS[pack.format]}</Badge>
          {statusBadge && (
            <Badge
              className={
                statusBadge.tone === "pending"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }
            >
              {statusBadge.label}
            </Badge>
          )}
        </div>
```

(The rest of the component body — title/description/rounds/stats — is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- PackCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing tests for `ProfileScreen`**

Create `src/features/profile/ProfileScreen.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileScreen } from "./ProfileScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    ban: vi.fn(),
    unban: vi.fn(),
    changeRole: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { list: vi.fn(), create: vi.fn(), getById: vi.fn() },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderScreen() {
  return render(
    <AuthProvider>
      <ProfileScreen />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(usersClient.getProfile).mockResolvedValue({
    id: "u1",
    username: "alice",
    bio: "I make Anime packs.",
    createdAt: "2026-01-01T00:00:00.000Z",
    followerCount: 3,
    isFollowedByMe: null,
  });
  vi.mocked(packsClient.list).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  });
});

describe("ProfileScreen", () => {
  it("shows the username, bio, and follower count", async () => {
    renderScreen();
    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("I make Anime packs.")).toBeInTheDocument();
    expect(screen.getByText(/3 followers?/)).toBeInTheDocument();
  });

  it("shows an 'Add a bio' prompt when bio is null", async () => {
    vi.mocked(usersClient.getProfile).mockResolvedValue({
      id: "u1",
      username: "alice",
      bio: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      followerCount: 0,
      isFollowedByMe: null,
    });
    renderScreen();
    expect(await screen.findByText(/add a bio/i)).toBeInTheDocument();
  });

  it("fetches the current user's own packs across every status", async () => {
    renderScreen();
    await screen.findByText("alice");
    expect(packsClient.list).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: "u1" }),
    );
  });

  it("shows a link to edit the profile", async () => {
    renderScreen();
    await screen.findByText("alice");
    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "/profile/edit",
    );
  });

  it("shows 'no packs yet' when the user has created nothing", async () => {
    renderScreen();
    expect(await screen.findByText(/no packs yet/i)).toBeInTheDocument();
  });

  it("renders a pack grid with status badges when packs exist", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [
        {
          id: "p1",
          title: "My Pack",
          description: "desc",
          coverTone: "#111",
          format: "save_one",
          tags: [],
          authorId: "u1",
          createdAt: "2026-01-01T00:00:00.000Z",
          totalPlays: 0,
          avgAgreementPercent: 0,
          status: "pending",
          rejectionReason: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderScreen();
    expect(await screen.findByText("My Pack")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test -- ProfileScreen.test.tsx`
Expected: FAIL — `Cannot find module './ProfileScreen'`.

- [ ] **Step 7: Implement `ProfileScreen`**

Create `src/features/profile/ProfileScreen.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { PackCard } from "@/src/features/home/PackCard";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";

export function ProfileScreen() {
  const { user, status: authStatus } = useAuth();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    let cancelled = false;
    Promise.all([
      usersClient.getProfile(user.id),
      packsClient.list({ authorId: user.id, limit: 50 }),
    ])
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
  }, [authStatus, user]);

  if (authStatus === "loading" || status === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view your profile.
        </Text>
        <Link
          href="/auth?next=%2Fprofile"
          className={buttonClassName("primary", "mt-4 w-fit")}
        >
          Log in
        </Link>
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">
          Couldn&apos;t load your profile. Try again later.
        </Text>
      </div>
    );
  }

  const initial = profile.username.slice(0, 1).toUpperCase();

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
              {profile.followerCount} follower
              {profile.followerCount === 1 ? "" : "s"}
            </Text>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className={buttonClassName("secondary", "w-fit")}
        >
          Edit profile
        </Link>
      </div>

      <div className="mb-10">
        {profile.bio ? (
          <Text variant="secondary">{profile.bio}</Text>
        ) : (
          <Link href="/profile/edit">
            <Text variant="tertiary" className="italic">
              Add a bio to tell people what your packs are about.
            </Text>
          </Link>
        )}
      </div>

      <Text as="h2" variant="title" className="mb-4 text-lg">
        My Packs
      </Text>
      {packs.length === 0 ? (
        <Text variant="secondary">No packs yet — create your first one!</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} showStatus />
          ))}
        </div>
      )}
    </div>
  );
}
```

Check `src/shared/components/Button.tsx` first to confirm `buttonClassName`'s exact export/signature (`buttonClassName(variant, className)`) matches how it's used elsewhere in this codebase (e.g. `RankPlayScreen.tsx`'s login-prompt button) — adjust if it differs.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- ProfileScreen.test.tsx`
Expected: PASS.

- [ ] **Step 9: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/home/PackCard.tsx src/features/home/PackCard.test.tsx src/features/profile/ProfileScreen.tsx src/features/profile/ProfileScreen.test.tsx
git commit -m "feat: add ProfileScreen with bio, follower count, and My Packs"
```

---

### Task 3: `ProfileEditForm` component

**Files:**

- Create: `src/features/profile/ProfileEditForm.tsx`
- Create: `src/features/profile/ProfileEditForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/profile/ProfileEditForm.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileEditForm } from "./ProfileEditForm";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { usersClient } from "@/src/shared/lib/users-client";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    ban: vi.fn(),
    unban: vi.fn(),
    changeRole: vi.fn(),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderForm() {
  return render(
    <AuthProvider>
      <ProfileEditForm />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(usersClient.getProfile).mockResolvedValue({
    id: "u1",
    username: "alice",
    bio: "Old bio",
    createdAt: "2026-01-01T00:00:00.000Z",
    followerCount: 0,
    isFollowedByMe: null,
  });
  vi.mocked(usersClient.updateProfile).mockResolvedValue({
    id: "u1",
    bio: "New bio",
  });
});

describe("ProfileEditForm", () => {
  it("pre-fills the textarea with the current bio", async () => {
    renderForm();
    expect(await screen.findByDisplayValue("Old bio")).toBeInTheDocument();
  });

  it("saves the new bio and redirects to /profile on success", async () => {
    const user = userEvent.setup();
    renderForm();
    const textarea = await screen.findByDisplayValue("Old bio");
    await user.clear(textarea);
    await user.type(textarea, "New bio");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(usersClient.updateProfile).toHaveBeenCalledWith("New bio"),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile"));
  });

  it("shows a character count against the 280 limit", async () => {
    renderForm();
    await screen.findByDisplayValue("Old bio");
    expect(screen.getByText(/280/)).toBeInTheDocument();
  });

  it("shows an error message if saving fails", async () => {
    vi.mocked(usersClient.updateProfile).mockRejectedValue(
      new Error("network error"),
    );
    const user = userEvent.setup();
    renderForm();
    await screen.findByDisplayValue("Old bio");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/couldn.t save/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ProfileEditForm.test.tsx`
Expected: FAIL — `Cannot find module './ProfileEditForm'`.

- [ ] **Step 3: Implement `ProfileEditForm`**

Create `src/features/profile/ProfileEditForm.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

const BIO_MAX = 280;

export function ProfileEditForm() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    usersClient
      .getProfile(user.id)
      .then((profile) => {
        setBio(profile.bio ?? "");
        setLoaded(true);
      })
      .catch(() => setError("Couldn't load your current bio."));
  }, [authStatus, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await usersClient.updateProfile(bio);
      router.push("/profile");
    } catch {
      setError("Couldn't save your changes. Try again.");
      setPending(false);
    }
  }

  if (authStatus === "loading" || (authStatus === "authenticated" && !loaded))
    return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to edit your profile.
        </Text>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md px-7 py-10"
    >
      <Text as="h1" variant="title" className="mb-6 text-2xl">
        Edit profile
      </Text>

      <label className="mb-2 flex items-center justify-between">
        <Text variant="secondary" className="text-xs">
          Bio
        </Text>
        <Text variant="tertiary" className="text-xs">
          {bio.length}/{BIO_MAX}
        </Text>
      </label>
      <textarea
        value={bio}
        onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX))}
        maxLength={BIO_MAX}
        rows={4}
        placeholder="Tell people what your packs are about."
        className="w-full rounded-[10px] border border-border bg-surface p-3 text-sm text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      />

      {error && <Text className="mt-3 text-sm text-[#ff6b6b]">{error}</Text>}

      <Button type="submit" disabled={pending} className="mt-6 w-fit">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProfileEditForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/ProfileEditForm.tsx src/features/profile/ProfileEditForm.test.tsx
git commit -m "feat: add ProfileEditForm for bio editing"
```

---

### Task 4: Routing + `UserMenu` nav link

**Files:**

- Create: `app/profile/page.tsx`
- Create: `app/profile/edit/page.tsx`
- Modify: `src/shared/components/UserMenu.tsx`
- Modify: `src/shared/components/UserMenu.test.tsx`

- [ ] **Step 1: Create the two route pages**

Create `app/profile/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ProfileScreen } from "@/src/features/profile/ProfileScreen";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
```

Create `app/profile/edit/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ProfileEditForm } from "@/src/features/profile/ProfileEditForm";

export const metadata: Metadata = {
  title: "Edit profile",
};

export default function ProfileEditPage() {
  return <ProfileEditForm />;
}
```

- [ ] **Step 2: Write the failing test for the new nav link**

In `src/shared/components/UserMenu.test.tsx`, read the file first, then add (following the existing pattern for how the `Docs`/`Settings` link tests are written):

```tsx
it("links to the profile page", async () => {
  const user = userEvent.setup();
  render(<UserMenu user={MOCK_USER} onLogout={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Account menu" }));
  expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
    "href",
    "/profile",
  );
});
```

(Match `MOCK_USER`'s exact name/shape to whatever this test file already defines.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- UserMenu.test.tsx`
Expected: FAIL — no "Profile" menuitem exists yet.

- [ ] **Step 4: Add the Profile link to `UserMenu`**

In `src/shared/components/UserMenu.tsx`, add a new `Link` between the user-info header block and the "Docs" link:

```tsx
<Link
  href="/profile"
  role="menuitem"
  onClick={() => setOpen(false)}
  className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
>
  Profile
</Link>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- UserMenu.test.tsx`
Expected: PASS.

- [ ] **Step 6: Verify the whole suite, typecheck, lint, build**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add app/profile src/shared/components/UserMenu.tsx src/shared/components/UserMenu.test.tsx
git commit -m "feat: add /profile and /profile/edit routes, link from UserMenu"
```

---

### Task 5: Final verify + review + manual browser test + PR + merge

- [ ] **Step 1: Run the full verification gate**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer`**

Review the full diff on this branch against `develop`.

- [ ] **Step 3: Manual browser verification**

Start both dev servers (frontend + backend). Log in, navigate to `/profile` via the UserMenu, confirm: username/bio/follower-count render, "Add a bio" prompt shows for a fresh account, creating a pack and returning to Profile shows it in "My Packs" with a "Pending review" badge, clicking "Edit profile" opens `/profile/edit` pre-filled with the current bio, saving a new bio redirects back to `/profile` and shows the updated text.

- [ ] **Step 4: Push, open a PR against `develop`, and merge once green**

Follow `.claude/workflows/pull-request.md`. Reference and close velanto-frontend#26 in the PR description.
