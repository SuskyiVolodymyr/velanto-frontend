// src/features/admin/StaffTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTab } from "./StaffTab";
import { AuthProvider } from "@/src/shared/lib/auth-context";
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
});
