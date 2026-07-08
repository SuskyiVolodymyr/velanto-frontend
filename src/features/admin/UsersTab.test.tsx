// src/features/admin/UsersTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersTab } from "./UsersTab";
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
  usersClient: { ban: vi.fn(), unban: vi.fn(), setTrusted: vi.fn() },
}));

const ADMIN: User = {
  id: "admin1",
  email: "admin@example.com",
  username: "admin1",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const TARGET: AdminUserRow = {
  id: "u2",
  username: "bob",
  email: "bob@example.com",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  bannedUntil: null,
  trusted: false,
};

function renderAsAdmin() {
  vi.mocked(authClient.refresh).mockResolvedValue({ accessToken: "token", user: ADMIN });
  return render(
    <AuthProvider>
      <UsersTab />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsersTab", () => {
  it("fetches page 1 and renders matching users", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    renderAsAdmin();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(adminClient.listUsers).toHaveBeenCalledWith({ q: undefined, page: 1, limit: 20 });
  });

  it("bans a user after picking a duration and entering a reason", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    // A week out from "now" — computed relative to the real clock (not a
    // hardcoded date) so this assertion can't go stale as time passes.
    const bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    vi.mocked(usersClient.ban).mockResolvedValue({ id: "u2", bannedUntil });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Ban" }));
    await user.type(screen.getByLabelText("Ban reason"), "spamming");
    await user.click(screen.getByRole("button", { name: "Confirm ban" }));

    await waitFor(() =>
      expect(usersClient.ban).toHaveBeenCalledWith("u2", { duration: "week", reason: "spamming" }),
    );
    expect(
      await screen.findByText(`Banned until ${new Date(bannedUntil).toLocaleDateString()}`),
    ).toBeInTheDocument();
  });

  it("does not show a Ban button for a target the actor cannot act on (equal rank)", async () => {
    const peerAdmin: AdminUserRow = { ...TARGET, id: "u3", username: "peer", role: "admin" };
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [peerAdmin], total: 1, page: 1, limit: 20 });
    renderAsAdmin();

    await screen.findByText("peer");
    expect(screen.queryByRole("button", { name: "Ban" })).not.toBeInTheDocument();
  });

  it("shows a Trust button for an untrusted target and marks them trusted on click", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [TARGET], total: 1, page: 1, limit: 20 });
    vi.mocked(usersClient.setTrusted).mockResolvedValue({ id: "u2", trusted: true });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Trust" }));

    await waitFor(() => expect(usersClient.setTrusted).toHaveBeenCalledWith("u2", true));
    expect(await screen.findByRole("button", { name: "Untrust" })).toBeInTheDocument();
  });

  it("shows an Untrust button for a trusted target and reverts them on click", async () => {
    const trustedTarget: AdminUserRow = { ...TARGET, trusted: true };
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [trustedTarget], total: 1, page: 1, limit: 20 });
    vi.mocked(usersClient.setTrusted).mockResolvedValue({ id: "u2", trusted: false });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Untrust" }));

    await waitFor(() => expect(usersClient.setTrusted).toHaveBeenCalledWith("u2", false));
    expect(await screen.findByRole("button", { name: "Trust" })).toBeInTheDocument();
  });

  it("does not show a Trust button for a target the actor cannot act on (equal rank)", async () => {
    const peerAdmin: AdminUserRow = { ...TARGET, id: "u3", username: "peer", role: "admin" };
    vi.mocked(adminClient.listUsers).mockResolvedValue({ items: [peerAdmin], total: 1, page: 1, limit: 20 });
    renderAsAdmin();

    await screen.findByText("peer");
    expect(screen.queryByRole("button", { name: "Trust" })).not.toBeInTheDocument();
  });
});
