// src/features/admin/AdminScreen.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { AdminScreen } from "./AdminScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { User } from "@/src/shared/types/user";

const push = vi.fn();
const replace = vi.fn();
// The active tab is derived from ?tab=, so tests drive it through this.
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/admin",
  useSearchParams: () => searchParams,
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
vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { overview: vi.fn(), listUsers: vi.fn(), auditLogs: vi.fn() },
}));

const MANAGER: User = {
  id: "m1",
  email: "manager@example.com",
  username: "manager1",
  role: "manager",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const PLAIN_USER: User = {
  ...MANAGER,
  id: "u1",
  role: "user",
  username: "plain",
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  vi.mocked(adminClient.overview).mockResolvedValue({
    registeredUsers: 0,
    packs: 0,
    plays: 0,
    onlineUsers: null,
    pendingReports: 0,
    newUsersThisWeek: 0,
    newPacksThisWeek: 0,
    playsThisWeek: 0,
    playsLast7Days: [],
    topPacksToday: [],
  });
});

describe("AdminScreen", () => {
  it("renders the Overview tab by default for a manager", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: MANAGER,
    });
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    expect(await screen.findByText("Registered users")).toBeInTheDocument();
  });

  // The tab is derived from the URL, so a click writes ?tab= rather than
  // flipping local state; the render then follows from the new param.
  it("puts the clicked tab in the URL", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: MANAGER,
    });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    await screen.findByText("Registered users");
    await user.click(screen.getByRole("tab", { name: "Logs" }));

    expect(replace).toHaveBeenCalledWith("/admin?tab=logs", { scroll: false });
  });

  // Regression guard: the tab used to live in component state, so /admin?tab=users
  // opened on Overview and a refresh threw you back to Overview every time.
  it("opens on the tab named in ?tab= instead of falling back to Overview", async () => {
    searchParams = new URLSearchParams("tab=logs");
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: MANAGER,
    });
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    expect(
      await screen.findByLabelText("Search actor, target, details"),
    ).toBeInTheDocument();
  });

  it("falls back to Overview for an unknown ?tab= value", async () => {
    searchParams = new URLSearchParams("tab=not-a-tab");
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: MANAGER,
    });
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    expect(await screen.findByText("Registered users")).toBeInTheDocument();
  });

  it("redirects home for an authenticated user without admin/manager role", async () => {
    vi.mocked(authClient.refresh).mockResolvedValue({
      accessToken: "token",
      user: PLAIN_USER,
    });
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    // Locks in the no-flash guarantee: the tabs (and thus any admin content)
    // must never render for a disallowed role, not even for a frame before
    // the redirect fires.
    expect(
      screen.queryByRole("tab", { name: "Overview" }),
    ).not.toBeInTheDocument();
  });

  it("shows a login prompt when unauthenticated", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AdminScreen />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("You need to be logged in to view this page."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fadmin");
  });
});
