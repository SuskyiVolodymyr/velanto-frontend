import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { AppHeader } from "./AppHeader";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { ApiError } from "@/src/shared/lib/api-client";
import { notificationsClient } from "@/src/shared/lib/notifications-client";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

// NotificationsBell polls this on mount whenever AppHeader renders
// authenticated — stub it so these auth-focused tests don't make (or wait
// on) real network calls.
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

function renderHeader() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider>
          <AppHeader />
        </AuthProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = "/";
  vi.mocked(notificationsClient.unreadCount).mockResolvedValue({ count: 0 });
});

describe("AppHeader", () => {
  it("shows only the brand mark while the session is still loading", () => {
    // Never resolves within the test — status stays "loading".
    vi.mocked(authClient.refresh).mockReturnValue(new Promise(() => {}));
    renderHeader();

    expect(screen.getByText("VELANTO")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Log out" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Log in link when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderHeader();

    const link = await screen.findByRole("link", { name: "Log in" });
    expect(link).toHaveAttribute("href", "/auth");
  });

  it("hides the Log in link on the auth page itself", async () => {
    pathname = "/auth";
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderHeader();

    // Give the refresh-on-mount rejection time to settle to "unauthenticated".
    await waitFor(() =>
      expect(authClient.refresh).toHaveBeenCalled(),
    );
    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
  });

  it("shows the username and a Log out control when authenticated", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderHeader();

    const trigger = await screen.findByRole("button", { name: "Account menu" });
    expect(trigger).toHaveTextContent("A");
    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
  });

  it("renders the notifications bell only when authenticated", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderHeader();

    await screen.findByRole("link", { name: "Log in" });
    expect(
      screen.queryByRole("button", { name: /notifications/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the notifications bell when authenticated", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    renderHeader();

    expect(
      await screen.findByRole("button", { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it("logging out clears the session and shows Log in again", async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "access-token",
      user: {
        id: "u1",
        email: "a@example.com",
        username: "alice",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    vi.mocked(authClient.logout).mockResolvedValue({ success: true });
    renderHeader();

    await screen.findByRole("button", { name: "Account menu" });
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(
      await screen.findByRole("link", { name: "Log in" }),
    ).toBeInTheDocument();
    expect(authClient.logout).toHaveBeenCalledTimes(1);
  });
});
