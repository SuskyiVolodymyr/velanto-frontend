// src/features/admin/StaffTab.test.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { StaffTab } from "./StaffTab";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient } from "@/src/shared/lib/users-client";
import type { User } from "@/src/shared/types/user";
import type { AdminUserRow } from "@/src/shared/types/admin";

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
  adminClient: { listUsers: vi.fn() },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { changeRole: vi.fn() },
}));

const MANAGER: User = {
  id: "m1",
  email: "manager@example.com",
  username: "manager1",
  role: "manager",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const ADMIN: User = {
  id: "a1",
  email: "admin@example.com",
  username: "admin1",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const TARGET: AdminUserRow = {
  id: "u2",
  username: "bob",
  email: "bob@example.com",
  role: "moderator",
  createdAt: "2026-01-01T00:00:00.000Z",
  bannedUntil: null,
  trusted: false,
  packs: 3,
  plays: 9,
  staffAddedBy: "admin1",
  staffSince: "2026-03-01T00:00:00.000Z",
};

function mockStaff(items: AdminUserRow[]) {
  vi.mocked(adminClient.listUsers).mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    limit: 20,
  });
}

function renderAs(actor: User) {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: actor,
  });
  return render(
    <AuthProvider>
      <StaffTab />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StaffTab", () => {
  it("asks the backend for staff only, not every user", async () => {
    mockStaff([TARGET]);
    renderAs(ADMIN);

    await screen.findByText("bob");
    expect(adminClient.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ staff: true }),
    );
  });

  it("shows each member's ADDED BY and SINCE provenance", async () => {
    mockStaff([TARGET]);
    renderAs(ADMIN);

    await screen.findByText("bob");
    expect(screen.getByText("admin1")).toBeInTheDocument();
    expect(
      screen.getByText(new Date(TARGET.staffSince!).toLocaleDateString()),
    ).toBeInTheDocument();
  });

  // Seeded/legacy staff have no promoter — nobody in the User table put them
  // there — so they read as "System" rather than a blank cell or a made-up name.
  it("renders 'System' as the promoter for a member with no recorded promoter", async () => {
    mockStaff([{ ...TARGET, staffAddedBy: null }]);
    renderAs(ADMIN);

    await screen.findByText("bob");
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("offers an admin the staff roles above the member's, but never 'user'", async () => {
    mockStaff([TARGET]);
    renderAs(ADMIN);

    await screen.findByText("bob");
    const select = screen.getByLabelText("Change role for bob");
    const values = Array.from(select.querySelectorAll("option")).map((o) =>
      o.getAttribute("value"),
    );
    // 'user' is the Remove button's job, not a dropdown entry.
    expect(values).not.toContain("user");
    expect(values).toContain("manager");
  });

  // A manager cannot grant its own rank, and demotion lives on Remove — so there
  // is no role left to offer, and the role renders as a static badge.
  it("shows no role dropdown for a manager acting on a moderator", async () => {
    mockStaff([TARGET]);
    renderAs(MANAGER);

    await screen.findByText("bob");
    expect(
      screen.queryByLabelText("Change role for bob"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("changes a member's role via the select", async () => {
    mockStaff([TARGET]);
    vi.mocked(usersClient.changeRole).mockResolvedValue({
      id: "u2",
      role: "manager",
    });
    const user = userEvent.setup();
    renderAs(ADMIN);

    await screen.findByText("bob");
    await user.selectOptions(
      screen.getByLabelText("Change role for bob"),
      "manager",
    );

    await waitFor(() =>
      expect(usersClient.changeRole).toHaveBeenCalledWith("u2", "manager"),
    );
  });

  it("Remove demotes the member back to a plain user", async () => {
    mockStaff([TARGET]);
    vi.mocked(usersClient.changeRole).mockResolvedValue({
      id: "u2",
      role: "user",
    });
    const user = userEvent.setup();
    renderAs(ADMIN);

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(usersClient.changeRole).toHaveBeenCalledWith("u2", "user"),
    );
  });

  it("shows an error when the role change is rejected", async () => {
    mockStaff([TARGET]);
    vi.mocked(usersClient.changeRole).mockRejectedValue(new Error("forbidden"));
    const user = userEvent.setup();
    renderAs(ADMIN);

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText("Couldn't change this member's role. Try again."),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no staff members", async () => {
    mockStaff([]);
    renderAs(ADMIN);

    expect(
      await screen.findByText("No staff members yet."),
    ).toBeInTheDocument();
  });

  it("gives a manager no controls at all over a peer manager", async () => {
    mockStaff([{ ...TARGET, id: "u3", username: "peer", role: "manager" }]);
    renderAs(MANAGER);

    await screen.findByText("peer");
    expect(
      screen.queryByLabelText("Change role for peer"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  describe("add staff", () => {
    it("resolves the email to a user id, then grants the role", async () => {
      mockStaff([]);
      vi.mocked(usersClient.changeRole).mockResolvedValue({
        id: "u9",
        role: "moderator",
      });
      const user = userEvent.setup();
      renderAs(ADMIN);
      await screen.findByText("No staff members yet.");

      // The lookup that resolves the typed email.
      vi.mocked(adminClient.listUsers).mockResolvedValueOnce({
        items: [{ ...TARGET, id: "u9", email: "new@example.com" }],
        total: 1,
        page: 1,
        limit: 50,
      });

      await user.type(
        screen.getByLabelText("Email of the user to add as staff"),
        "new@example.com",
      );
      await user.click(screen.getByRole("button", { name: "+ Add staff" }));

      await waitFor(() =>
        expect(usersClient.changeRole).toHaveBeenCalledWith("u9", "moderator"),
      );
    });

    // `q` is a SUBSTRING search, so the top hit may be a different account —
    // only an exact email match may be promoted.
    it("refuses to promote when no row matches the email exactly", async () => {
      mockStaff([]);
      const user = userEvent.setup();
      renderAs(ADMIN);
      await screen.findByText("No staff members yet.");

      vi.mocked(adminClient.listUsers).mockResolvedValueOnce({
        items: [{ ...TARGET, id: "u9", email: "other@example.com" }],
        total: 1,
        page: 1,
        limit: 50,
      });

      await user.type(
        screen.getByLabelText("Email of the user to add as staff"),
        "new@example.com",
      );
      await user.click(screen.getByRole("button", { name: "+ Add staff" }));

      expect(
        await screen.findByText("No user with that email."),
      ).toBeInTheDocument();
      expect(usersClient.changeRole).not.toHaveBeenCalled();
    });
  });

  describe("streamer mode", () => {
    afterEach(() => localStorage.clear());

    function renderWithStreamerMode() {
      vi.mocked(authClient.refresh).mockResolvedValue({
        accessToken: "token",
        user: ADMIN,
      });
      return render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <AuthProvider>
            <StreamerModeProvider>
              <StaffTab />
            </StreamerModeProvider>
          </AuthProvider>
        </NextIntlClientProvider>,
      );
    }

    it("masks a member's username and email but keeps role and controls visible", async () => {
      localStorage.setItem("velanto:streamer-mode", "on");
      mockStaff([TARGET]);
      renderWithStreamerMode();

      // The role select is a stable, non-identity anchor that renders once the
      // row is present. Its aria-label is the name-free generic form so a screen
      // reader doesn't leak the identity.
      await screen.findByLabelText("Change role for this member");

      expect(screen.queryByText("bob")).not.toBeInTheDocument();
      expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Change role for bob"),
      ).not.toBeInTheDocument();
      // …but the moderator's action controls stay usable.
      expect(
        screen.getByRole("button", { name: "Remove" }),
      ).toBeInTheDocument();
    });

    it("reveals the username and email when the row is revealed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("velanto:streamer-mode", "on");
      mockStaff([TARGET]);
      renderWithStreamerMode();

      await screen.findByLabelText("Change role for this member");
      const revealButtons = screen.getAllByRole("button", { name: /reveal/i });
      // One reveal control per masked identity field (username + email).
      expect(revealButtons).toHaveLength(2);

      // Both fields share the row id, so a single reveal unmasks the identity.
      await user.click(revealButtons[0]);

      expect(screen.getByText("bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("shows identity normally when streamer mode is off", async () => {
      mockStaff([TARGET]);
      renderWithStreamerMode();

      expect(await screen.findByText("bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /reveal/i }),
      ).not.toBeInTheDocument();
      // With streamer mode off, the specific (name-carrying) label is kept.
      expect(screen.getByLabelText("Change role for bob")).toBeInTheDocument();
    });
  });
});
