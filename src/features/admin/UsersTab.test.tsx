// src/features/admin/UsersTab.test.tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient as render } from "@/src/shared/test/render-with-query-client";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { UsersTab } from "./UsersTab";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import type { User } from "@/src/shared/types/user";
import type { AdminUserRow } from "@/src/shared/types/admin";
import type { RulesDocument } from "@/src/shared/types/rules";

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
  usersClient: { ban: vi.fn(), unban: vi.fn(), setTrusted: vi.fn() },
}));
vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));

const RULES: RulesDocument = {
  version: 1,
  categories: [
    { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
    { id: "hate_discrimination", title: "Hate & Discrimination", rules: [] },
  ],
};

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
  packs: 0,
  plays: 0,
  staffAddedBy: null,
  staffSince: null,
};

function renderAsAdmin() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: ADMIN,
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <UsersTab />
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rulesClient.getRules).mockResolvedValue(RULES);
});

describe("UsersTab", () => {
  it("fetches page 1 and renders matching users", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsAdmin();

    expect(await screen.findByText("bob")).toBeInTheDocument();
    // staff:false — staff are managed on the Staff tab, not listed here too.
    expect(adminClient.listUsers).toHaveBeenCalledWith({
      q: undefined,
      staff: false,
      page: 1,
      limit: 20,
    });
  });

  it("bans a user after picking a duration and a rule-category reason", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    // A week out from "now" — computed relative to the real clock (not a
    // hardcoded date) so this assertion can't go stale as time passes.
    const bannedUntil = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    vi.mocked(usersClient.ban).mockResolvedValue({ id: "u2", bannedUntil });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Ban" }));
    // Reason options come from the rules fetch — a category, no detail needed.
    await screen.findByRole("option", { name: "Spam & Manipulation" });
    await user.selectOptions(
      screen.getByLabelText("Reason"),
      "spam_manipulation",
    );
    await user.click(screen.getByRole("button", { name: "Confirm ban" }));

    await waitFor(() =>
      expect(usersClient.ban).toHaveBeenCalledWith("u2", {
        duration: "week",
        reason: "spam_manipulation",
      }),
    );
    expect(
      await screen.findByText(
        `Banned until ${new Date(bannedUntil).toLocaleDateString()}`,
      ),
    ).toBeInTheDocument();
  });

  it("requires detail before allowing a ban with the 'Other' reason", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    const bannedUntil = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    vi.mocked(usersClient.ban).mockResolvedValue({ id: "u2", bannedUntil });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Ban" }));
    await screen.findByRole("option", { name: "Other" });
    await user.selectOptions(screen.getByLabelText("Reason"), "other");

    // Confirm stays disabled until required detail is supplied.
    expect(screen.getByRole("button", { name: "Confirm ban" })).toBeDisabled();
    await user.type(screen.getByLabelText(/details/i), "manual review");
    expect(screen.getByRole("button", { name: "Confirm ban" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirm ban" }));
    await waitFor(() =>
      expect(usersClient.ban).toHaveBeenCalledWith("u2", {
        duration: "week",
        reason: "other",
        reasonDetail: "manual review",
      }),
    );
  });

  it("does not show a Ban button for a target the actor cannot act on (equal rank)", async () => {
    const peerAdmin: AdminUserRow = {
      ...TARGET,
      id: "u3",
      username: "peer",
      role: "admin",
    };
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [peerAdmin],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsAdmin();

    await screen.findByText("peer");
    expect(
      screen.queryByRole("button", { name: "Ban" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Trust button for an untrusted target and marks them trusted on click", async () => {
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [TARGET],
      total: 1,
      page: 1,
      limit: 20,
    });
    vi.mocked(usersClient.setTrusted).mockResolvedValue({
      id: "u2",
      trusted: true,
    });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Trust" }));

    await waitFor(() =>
      expect(usersClient.setTrusted).toHaveBeenCalledWith("u2", true),
    );
    expect(
      await screen.findByRole("button", { name: "Untrust" }),
    ).toBeInTheDocument();
  });

  it("shows an Untrust button for a trusted target and reverts them on click", async () => {
    const trustedTarget: AdminUserRow = { ...TARGET, trusted: true };
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [trustedTarget],
      total: 1,
      page: 1,
      limit: 20,
    });
    vi.mocked(usersClient.setTrusted).mockResolvedValue({
      id: "u2",
      trusted: false,
    });
    const user = userEvent.setup();
    renderAsAdmin();

    await screen.findByText("bob");
    await user.click(screen.getByRole("button", { name: "Untrust" }));

    await waitFor(() =>
      expect(usersClient.setTrusted).toHaveBeenCalledWith("u2", false),
    );
    expect(
      await screen.findByRole("button", { name: "Trust" }),
    ).toBeInTheDocument();
  });

  it("does not show a Trust button for a target the actor cannot act on (equal rank)", async () => {
    const peerAdmin: AdminUserRow = {
      ...TARGET,
      id: "u3",
      username: "peer",
      role: "admin",
    };
    vi.mocked(adminClient.listUsers).mockResolvedValue({
      items: [peerAdmin],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderAsAdmin();

    await screen.findByText("peer");
    expect(
      screen.queryByRole("button", { name: "Trust" }),
    ).not.toBeInTheDocument();
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
              <UsersTab />
            </StreamerModeProvider>
          </AuthProvider>
        </NextIntlClientProvider>,
      );
    }

    it("masks a user's username and email but keeps ban status and controls visible", async () => {
      localStorage.setItem("velanto:streamer-mode", "on");
      vi.mocked(adminClient.listUsers).mockResolvedValue({
        items: [TARGET],
        total: 1,
        page: 1,
        limit: 20,
      });
      renderWithStreamerMode();

      // The Ban button is a stable non-identity anchor that renders with the row.
      await screen.findByRole("button", { name: "Ban" });

      // Identity is redacted…
      expect(screen.queryByText("bob")).not.toBeInTheDocument();
      expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
      // …but the ban status and the moderator's controls stay usable. (The
      // Users table has no ROLE column — per the design, role lives on the
      // Staff tab.)
      expect(screen.getByText("Not banned")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ban" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Trust" })).toBeInTheDocument();
    });

    it("reveals the username and email when the row is revealed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("velanto:streamer-mode", "on");
      vi.mocked(adminClient.listUsers).mockResolvedValue({
        items: [TARGET],
        total: 1,
        page: 1,
        limit: 20,
      });
      renderWithStreamerMode();

      await screen.findByRole("button", { name: "Ban" });
      const revealButtons = screen.getAllByRole("button", { name: /reveal/i });
      // One reveal control per masked identity field (username + email).
      expect(revealButtons).toHaveLength(2);

      // Both fields share the row id, so a single reveal unmasks the identity.
      await user.click(revealButtons[0]);

      expect(screen.getByText("bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("shows identity normally when streamer mode is off", async () => {
      vi.mocked(adminClient.listUsers).mockResolvedValue({
        items: [TARGET],
        total: 1,
        page: 1,
        limit: 20,
      });
      renderWithStreamerMode();

      expect(await screen.findByText("bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /reveal/i }),
      ).not.toBeInTheDocument();
    });
  });
});
