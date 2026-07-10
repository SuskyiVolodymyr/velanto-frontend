// src/features/admin/StaffTab.test.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  authClient: { register: vi.fn(), login: vi.fn(), logout: vi.fn(), refresh: vi.fn() },
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

const TARGET: AdminUserRow = {
  id: "u2",
  username: "bob",
  email: "bob@example.com",
  role: "moderator",
  createdAt: "2026-01-01T00:00:00.000Z",
  bannedUntil: null,
  trusted: false,
};

function renderAsManager() {
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "token", user: MANAGER });
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
  it("fetches page 1 and renders matching users with a role select", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    renderAsManager();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByLabelText("Change role for bob")).toBeInTheDocument();
  });

  it("does not offer 'manager' as an option for a manager actor (cannot grant own rank)", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    renderAsManager();

    await screen.findByText("bob");
    const select = screen.getByLabelText("Change role for bob");
    const optionValues = Array.from(select.querySelectorAll("option")).map((o) => o.getAttribute("value"));
    expect(optionValues).not.toContain("manager");
  });

  it("changes a user's role via the select", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    vi.mocked(usersClient.changeRole).mockResolvedValue({ id: "u2", role: "user" });
    const user = userEvent.setup();
    renderAsManager();

    await screen.findByText("bob");
    await user.selectOptions(screen.getByLabelText("Change role for bob"), "user");

    await waitFor(() => expect(usersClient.changeRole).toHaveBeenCalledWith("u2", "user"));
  });

  it("shows an error and keeps the original role when the role change is rejected", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    vi.mocked(usersClient.changeRole).mockRejectedValue(new Error("forbidden"));
    const user = userEvent.setup();
    renderAsManager();

    await screen.findByText("bob");
    await user.selectOptions(screen.getByLabelText("Change role for bob"), "user");

    expect(
      await screen.findByText("Couldn't change this user's role. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("moderator")).toBeInTheDocument();
  });

  it("hides the role select for a target the actor cannot act on", async () => {
    const peerManager: AdminUserRow = { ...TARGET, id: "u3", username: "peer", role: "manager" };
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [peerManager], total: 1, page: 1, limit: 20 });
    renderAsManager();

    await screen.findByText("peer");
    expect(screen.queryByLabelText("Change role for peer")).not.toBeInTheDocument();
  });

  describe("streamer mode", () => {
    afterEach(() => localStorage.clear());

    function renderWithStreamerMode() {
      vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "token", user: MANAGER });
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

    it("masks a user's username and email but keeps role and controls visible", async () => {
      localStorage.setItem("velanto:streamer-mode", "on");
      vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
      renderWithStreamerMode();

      // Wait for the fetch to resolve — the role select is a stable, non-identity
      // anchor that renders once the row is present. Its aria-label is the
      // name-free generic form so a screen reader doesn't leak the identity.
      await screen.findByLabelText("Change role for this user");

      // Identity is redacted, in the a11y tree as well as visually…
      expect(screen.queryByText("bob")).not.toBeInTheDocument();
      expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Change role for bob")).not.toBeInTheDocument();
      // …but role and the moderator's action control stay usable.
      expect(screen.getByText("moderator")).toBeInTheDocument();
      expect(screen.getByLabelText("Change role for this user")).toBeInTheDocument();
    });

    it("reveals the username and email when the row is revealed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("velanto:streamer-mode", "on");
      vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
      renderWithStreamerMode();

      await screen.findByLabelText("Change role for this user");
      const revealButtons = screen.getAllByRole("button", { name: /reveal/i });
      // One reveal control per masked identity field (username + email).
      expect(revealButtons).toHaveLength(2);

      // Both fields share the row id, so a single reveal unmasks the identity.
      await user.click(revealButtons[0]);

      expect(screen.getByText("bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("shows identity normally when streamer mode is off", async () => {
      vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
      renderWithStreamerMode();

      expect(await screen.findByText("bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reveal/i })).not.toBeInTheDocument();
      // With streamer mode off, the specific (name-carrying) label is kept.
      expect(screen.getByLabelText("Change role for bob")).toBeInTheDocument();
    });
  });
});
