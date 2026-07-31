import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { AppTopBar } from "./AppTopBar";
import {
  SearchQueryProvider,
  useSearchQuery,
} from "@/src/features/home/search-query-context";
import { notificationsClient } from "@/src/shared/lib/notifications-client";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const logout = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  current: {
    status: "authenticated" as string,
    user: null as { id: string; username: string } | null,
    logout,
  },
}));
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => auth.current,
}));

// The bell polls this on mount when authenticated — stub it so these tests
// don't make real network calls.
vi.mock("@/src/shared/lib/notifications-client", () => ({
  notificationsClient: {
    unreadCount: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    getPreferences: vi.fn(),
    setPreferences: vi.fn(),
  },
}));

const authedUser = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

/** Reports the shared, debounced term the feed would fetch on. */
function QueryProbe() {
  const { query } = useSearchQuery();
  return <p data-testid="shared-query">{query}</p>;
}

function renderTopBar(onMenuToggle = vi.fn()) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <SearchQueryProvider>
          <AppTopBar onMenuToggle={onMenuToggle} />
          <QueryProbe />
        </SearchQueryProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.current = { status: "authenticated", user: authedUser, logout };
  vi.mocked(notificationsClient.unreadCount).mockResolvedValue({ count: 0 });
});

describe("AppTopBar", () => {
  it("renders signed-in chrome: Create pack, bell, account menu; no Log in", () => {
    renderTopBar();
    expect(screen.getByRole("link", { name: "Create pack" })).toHaveAttribute(
      "href",
      "/create",
    );
    expect(
      screen.getByRole("button", { name: /notifications/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("renders signed-out chrome: Log in, Docs, Settings; no Create pack or bell", () => {
    auth.current = { status: "unauthenticated", user: null, logout };
    renderTopBar();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/auth",
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.queryByRole("link", { name: "Create pack" })).toBeNull();
    expect(screen.queryByRole("button", { name: /notifications/i })).toBeNull();
  });

  it("shows only the brand while the session is loading", () => {
    auth.current = { status: "loading", user: null, logout };
    renderTopBar();
    // Icon-only mobile brand mark (mock has no wordmark span here, and the
    // full "VELANTO" text alongside the hamburger/create/bell/account cluster
    // overflowed the header on a phone-width viewport).
    expect(screen.getByRole("link", { name: "Velanto" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Create pack" })).toBeNull();
  });

  // Search filters as you type now — Enter is a shortcut past the debounce,
  // not the trigger, and it must not navigate (that would remount the feed
  // and throw away the filter bar's selection).
  it("publishes the search term without navigating", async () => {
    const user = userEvent.setup();
    renderTopBar();

    await user.type(screen.getByRole("searchbox"), "anime");
    await waitFor(() =>
      expect(screen.getByTestId("shared-query")).toHaveTextContent("anime"),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("publishes immediately on Enter, and still does not navigate", async () => {
    const user = userEvent.setup();
    renderTopBar();

    await user.type(screen.getByRole("searchbox"), "anime{Enter}");

    expect(screen.getByTestId("shared-query")).toHaveTextContent("anime");
    expect(push).not.toHaveBeenCalled();
  });

  it("invokes onMenuToggle when the menu button is pressed", async () => {
    const user = userEvent.setup();
    const onMenuToggle = vi.fn();
    renderTopBar(onMenuToggle);
    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it("logging out calls the auth logout handler", async () => {
    const user = userEvent.setup();
    renderTopBar();
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
