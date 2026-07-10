# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/settings` route with two sections — Appearance (accent color picker, works for everyone) and Account (read-only info, auth-gated at the section level) — per `docs/superpowers/specs/2026-07-07-settings-screen-design.md`.

**Architecture:** A small theme-persistence helper (`localStorage` + a CSS custom property) backs both a `ThemeInitializer` (applies the stored accent app-wide on every page load) and `AppearanceSection` (lets the user change it). `AccountSection` reuses the exact per-section auth-gating pattern already proven in `CommentSection.tsx`. `SettingsScreen` composes both under a page heading; `app/settings/page.tsx` is a thin Server Component wrapper matching `app/docs/page.tsx`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library.

---

### Task 1: Theme persistence helper

**Files:**

- Create: `src/shared/lib/theme.ts`
- Test: `src/shared/lib/theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/theme.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { getStoredAccent, setStoredAccent } from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty("--acc");
});

describe("theme", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredAccent()).toBeNull();
  });

  it("setStoredAccent persists the color and returns it via getStoredAccent", () => {
    setStoredAccent("#7c8cff");
    expect(getStoredAccent()).toBe("#7c8cff");
  });

  it("setStoredAccent applies the color to the --acc CSS custom property", () => {
    setStoredAccent("#39d98a");
    expect(document.documentElement.style.getPropertyValue("--acc")).toBe(
      "#39d98a",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/lib/theme.test.ts`
Expected: FAIL — `Cannot find module './theme'`

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/lib/theme.ts
const ACCENT_STORAGE_KEY = "velanto:accent";

export function getStoredAccent(): string | null {
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccent(color: string): void {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
  } catch {
    // localStorage unavailable (e.g. private browsing) — the color still
    // applies for this session, it just won't persist across reloads.
  }
  document.documentElement.style.setProperty("--acc", color);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/lib/theme.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/theme.ts src/shared/lib/theme.test.ts
git commit -m "feat: add accent-color theme persistence helper"
```

---

### Task 2: AppearanceSection component

**Files:**

- Create: `src/features/settings/AppearanceSection.tsx`
- Test: `src/features/settings/AppearanceSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/settings/AppearanceSection.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceSection } from "./AppearanceSection";
import * as theme from "@/src/shared/lib/theme";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("AppearanceSection", () => {
  it("renders 4 accent swatches with the default active", () => {
    render(<AppearanceSection />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "Use accent color #00e5ff" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a swatch calls setStoredAccent with that color and updates the active swatch", async () => {
    const user = userEvent.setup();
    const setStoredAccentSpy = vi.spyOn(theme, "setStoredAccent");
    render(<AppearanceSection />);

    await user.click(
      screen.getByRole("button", { name: "Use accent color #7c8cff" }),
    );

    expect(setStoredAccentSpy).toHaveBeenCalledWith("#7c8cff");
    expect(
      screen.getByRole("button", { name: "Use accent color #7c8cff" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Use accent color #00e5ff" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects a previously-stored accent as active on mount", () => {
    vi.spyOn(theme, "getStoredAccent").mockReturnValue("#39d98a");
    render(<AppearanceSection />);

    expect(
      screen.getByRole("button", { name: "Use accent color #39d98a" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/settings/AppearanceSection.test.tsx`
Expected: FAIL — `Cannot find module './AppearanceSection'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/features/settings/AppearanceSection.tsx
"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { getStoredAccent, setStoredAccent } from "@/src/shared/lib/theme";

const DEFAULT_ACCENT = "#00e5ff";
const ACCENTS = [DEFAULT_ACCENT, "#7c8cff", "#39d98a", "#f5a623"];

export function AppearanceSection() {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    const stored = getStoredAccent();
    if (stored) setAccent(stored);
  }, []);

  function handleSelect(color: string) {
    setStoredAccent(color);
    setAccent(color);
  }

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        Appearance
      </Text>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/[0.02] px-4 py-4">
        <div>
          <Text className="font-semibold">Accent color</Text>
          <Text variant="secondary" className="text-sm">
            Used for highlights, buttons, and progress bars.
          </Text>
        </div>
        <div className="flex gap-2">
          {ACCENTS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use accent color ${color}`}
              aria-pressed={accent === color}
              onClick={() => handleSelect(color)}
              className={cn(
                "h-7 w-7 rounded-[9px] border-2 transition-colors",
                accent === color ? "border-white" : "border-white/15",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/settings/AppearanceSection.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/AppearanceSection.tsx src/features/settings/AppearanceSection.test.tsx
git commit -m "feat: add AppearanceSection accent-color picker"
```

---

### Task 3: AccountSection component

**Files:**

- Create: `src/features/settings/AccountSection.tsx`
- Test: `src/features/settings/AccountSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/settings/AccountSection.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountSection } from "./AccountSection";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import type { User } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

const USER: User = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderAsAuthenticated() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: USER,
  });
  return render(
    <AuthProvider>
      <AccountSection />
    </AuthProvider>,
  );
}

function renderAsUnauthenticated() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
  return render(
    <AuthProvider>
      <AccountSection />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountSection", () => {
  it("shows the user's email and a static provider line when authenticated", async () => {
    renderAsAuthenticated();
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Signed in via email")).toBeInTheDocument();
  });

  it("shows a log-in prompt when unauthenticated", async () => {
    renderAsUnauthenticated();
    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
    expect(screen.queryByText("Signed in via email")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/settings/AccountSection.test.tsx`
Expected: FAIL — `Cannot find module './AccountSection'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/features/settings/AccountSection.tsx
"use client";

import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";

export function AccountSection() {
  const { status, user } = useAuth();

  if (status === "loading") return null;

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        Account
      </Text>
      {status === "authenticated" && user && (
        <div className="rounded-2xl border border-border bg-white/[0.02] px-4 py-4">
          <Text className="font-semibold">{user.email}</Text>
          <Text variant="secondary" className="text-sm">
            Signed in via email
          </Text>
        </div>
      )}
      {status === "unauthenticated" && (
        <div className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-foreground-secondary">
          <Link href="/auth" className="text-acc">
            Log in
          </Link>{" "}
          to view account settings.
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/settings/AccountSection.test.tsx`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/AccountSection.tsx src/features/settings/AccountSection.test.tsx
git commit -m "feat: add AccountSection with per-section auth gating"
```

---

### Task 4: ThemeInitializer + app-wide wiring

**Files:**

- Create: `src/shared/components/ThemeInitializer.tsx`
- Test: `src/shared/components/ThemeInitializer.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/ThemeInitializer.test.tsx
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeInitializer } from "./ThemeInitializer";
import * as theme from "@/src/shared/lib/theme";

beforeEach(() => {
  document.documentElement.style.removeProperty("--acc");
  vi.restoreAllMocks();
});

describe("ThemeInitializer", () => {
  it("applies a stored accent to the document root on mount", () => {
    vi.spyOn(theme, "getStoredAccent").mockReturnValue("#f5a623");
    render(<ThemeInitializer />);
    expect(document.documentElement.style.getPropertyValue("--acc")).toBe(
      "#f5a623",
    );
  });

  it("does nothing when no accent is stored", () => {
    vi.spyOn(theme, "getStoredAccent").mockReturnValue(null);
    render(<ThemeInitializer />);
    expect(document.documentElement.style.getPropertyValue("--acc")).toBe("");
  });

  it("renders no visible output", () => {
    const { container } = render(<ThemeInitializer />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/components/ThemeInitializer.test.tsx`
Expected: FAIL — `Cannot find module './ThemeInitializer'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/shared/components/ThemeInitializer.tsx
"use client";

import { useEffect } from "react";
import { getStoredAccent } from "@/src/shared/lib/theme";

export function ThemeInitializer() {
  useEffect(() => {
    const stored = getStoredAccent();
    if (stored) document.documentElement.style.setProperty("--acc", stored);
  }, []);

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/components/ThemeInitializer.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: Wire it into the root layout**

Modify `app/layout.tsx` — current relevant lines:

```tsx
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { AppHeader } from "@/src/shared/components/AppHeader";
import "./globals.css";
```

and:

```tsx
<body className="min-h-full flex flex-col">
  <AuthProvider>
    <AppHeader />
    {children}
  </AuthProvider>
</body>
```

Change to:

```tsx
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { AppHeader } from "@/src/shared/components/AppHeader";
import { ThemeInitializer } from "@/src/shared/components/ThemeInitializer";
import "./globals.css";
```

and:

```tsx
<body className="min-h-full flex flex-col">
  <ThemeInitializer />
  <AuthProvider>
    <AppHeader />
    {children}
  </AuthProvider>
</body>
```

(`ThemeInitializer` sits outside `AuthProvider` since it has nothing to do with auth — it only needs to run once per page load, same lifecycle scope as the rest of `body`.)

- [ ] **Step 6: Run the full test suite to confirm nothing else broke**

Run: `npm test`
Expected: all suites pass

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/ThemeInitializer.tsx src/shared/components/ThemeInitializer.test.tsx app/layout.tsx
git commit -m "feat: apply the stored accent color app-wide on load"
```

---

### Task 5: SettingsScreen composition + routing

**Files:**

- Create: `src/features/settings/SettingsScreen.tsx`
- Test: `src/features/settings/SettingsScreen.test.tsx`
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/settings/SettingsScreen.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsScreen } from "./SettingsScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn().mockRejectedValue(new Error("no session")),
  },
}));

describe("SettingsScreen", () => {
  it("renders the Preferences heading and both sections", async () => {
    render(
      <AuthProvider>
        <SettingsScreen />
      </AuthProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Preferences" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Accent color")).toBeInTheDocument();
    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/settings/SettingsScreen.test.tsx`
Expected: FAIL — `Cannot find module './SettingsScreen'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/features/settings/SettingsScreen.tsx
import { Text } from "@/src/shared/components/Text";
import { AppearanceSection } from "@/src/features/settings/AppearanceSection";
import { AccountSection } from "@/src/features/settings/AccountSection";

export function SettingsScreen() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Preferences
      </Text>
      <AppearanceSection />
      <AccountSection />
    </main>
  );
}
```

`SettingsScreen` itself needs no `"use client"` directive — it has no state or hooks of its own, it just composes two already-client components as children (a Server Component may render Client Components).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/settings/SettingsScreen.test.tsx`
Expected: PASS (1/1)

- [ ] **Step 5: Add the route**

```tsx
// app/settings/page.tsx
import type { Metadata } from "next";
import { SettingsScreen } from "@/src/features/settings/SettingsScreen";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/SettingsScreen.tsx src/features/settings/SettingsScreen.test.tsx app/settings/page.tsx
git commit -m "feat: add Settings screen route"
```

---

### Task 6: Final verification, review, manual test, PR, merge

- [ ] **Step 1: Run full verification**

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all clean.

- [ ] **Step 2: Dispatch review agents** (via the `Agent` tool)

- `pr-review-toolkit:code-reviewer` against `git diff develop...HEAD`.
- `ui-guardian` (this repo's custom agent, `.claude/agents/ui-guardian.md`) — pay particular attention to whether `AppearanceSection`'s swatch styling and `AccountSection`'s log-in prompt match established design-token/a11y conventions (compare against `CommentSection.tsx`'s log-in prompt and any existing color-swatch UI in the codebase, e.g. `CreatePackForm`'s cover-tone picker if one exists).
- `architecture-guardian` (`.claude/agents/architecture-guardian.md`) — confirm `ThemeInitializer` living in `shared/components/` (not a feature folder) is correct since it's genuinely app-wide, not settings-specific.

Address any real findings the same way prior features in this session did: fix, re-verify, don't argue with a correctly-identified defect.

- [ ] **Step 3: Manual browser verification** (via Claude Preview tools)

- Visit `/settings` while logged out: confirm Appearance renders and is clickable, confirm Account shows the "Log in to view account settings." prompt.
- Click a non-default accent swatch, confirm the page's accent-colored elements (e.g. active nav link, buttons) visibly change color.
- Reload the page: confirm the accent choice persisted.
- Navigate to `/` (Home): confirm the accent is still applied there too (proves the app-wide `ThemeInitializer` wiring works, not just a per-page effect).
- Log in: revisit `/settings`, confirm Account now shows the real email and "Signed in via email".

- [ ] **Step 4: Push, open PR, merge**

```bash
git push -u origin feature/settings-screen
```

Open a PR into `develop` titled `feat: add Settings screen (Appearance + Account)` with `Closes #28` in the body, summarizing what shipped and what was explicitly deferred (link velanto-frontend#44 and #45). Merge via squash once green, then manually close issue #28 (this repo's issues only auto-close on merge to `main`).

---

## Self-review

**Spec coverage:** Route/access (Task 5 route, Task 3/4 per-section gating) ✓. Appearance section + persistence + app-wide application (Tasks 1, 2, 4) ✓. Account section (Task 3) ✓. Composition (Task 5) ✓. Testing (every task has its own test) ✓. Explicitly-out-of-scope items (language, notifications, role switcher, delete account) — nothing to implement, already tracked as issues, no plan task needed for them.

**Placeholder scan:** No TBDs; every code step has complete, runnable code.

**Type consistency:** `getStoredAccent`/`setStoredAccent` signatures match between Task 1's definition and their Task 2/4 call sites. `AppearanceSection`/`AccountSection` component names and export shapes match what Task 5's `SettingsScreen` imports. `User` type fields (`email`) match `src/shared/types/user.ts`'s existing shape (confirmed against `CommentSection.test.tsx`'s identical `USER` fixture).
