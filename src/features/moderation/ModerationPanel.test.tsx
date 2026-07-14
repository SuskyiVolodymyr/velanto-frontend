import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ModerationPanel } from "./ModerationPanel";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { moderationClient } from "@/src/shared/lib/moderation-client";
import type { User } from "@/src/shared/types/user";

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/moderation",
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
vi.mock("@/src/shared/lib/reports-client", () => ({
  reportsClient: { list: vi.fn(), getById: vi.fn() },
}));
vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { moderationQueue: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}));
vi.mock("@/src/shared/lib/moderation-client", () => ({
  moderationClient: { counts: vi.fn() },
}));

const MODERATOR: User = {
  id: "m1",
  email: "mod@example.com",
  username: "mod1",
  role: "moderator",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const PLAIN_USER: User = {
  ...MODERATOR,
  id: "u1",
  role: "user",
  username: "u",
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  vi.mocked(reportsClient.list).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  vi.mocked(packsClient.moderationQueue).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  vi.mocked(moderationClient.counts).mockResolvedValue({
    pendingPacks: 3,
    newReports: 7,
  });
});

function signedInAs(user: User) {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user,
  });
}

describe("ModerationPanel", () => {
  it("opens on the Reports tab and badges each tab with its backlog", async () => {
    signedInAs(MODERATOR);
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("tab", {
        name: "Reports, 7 waiting",
        selected: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", {
        name: "Pack approvals, 3 waiting",
        selected: false,
      }),
    ).toBeInTheDocument();
  });

  // The tab lives in the URL, not component state: moderators link each other
  // at a queue, and a refresh must land back on the same tab.
  it("opens the tab named in the URL", async () => {
    searchParams = new URLSearchParams("tab=packs");
    signedInAs(MODERATOR);
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("tab", {
        name: /Pack approvals/,
        selected: true,
      }),
    ).toBeInTheDocument();
    expect(vi.mocked(packsClient.moderationQueue)).toHaveBeenCalled();
  });

  it("puts the tab in the URL when it is switched", async () => {
    signedInAs(MODERATOR);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    await user.click(
      await screen.findByRole("tab", { name: /Pack approvals/ }),
    );

    expect(replace).toHaveBeenCalledWith("/moderation?tab=packs", {
      scroll: false,
    });
  });

  // An unknown tab is a typo or a stale link, not a reason to show a blank
  // panel with no tab selected.
  it("falls back to Reports for an unrecognised tab in the URL", async () => {
    searchParams = new URLSearchParams("tab=nonsense");
    signedInAs(MODERATOR);
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("tab", { name: /Reports/, selected: true }),
    ).toBeInTheDocument();
  });

  // An empty queue is not news — a "0" badge is noise that trains moderators to
  // ignore the badge that matters.
  it("hides a tab's badge when that queue is empty", async () => {
    vi.mocked(moderationClient.counts).mockResolvedValue({
      pendingPacks: 0,
      newReports: 4,
    });
    signedInAs(MODERATOR);
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    expect(
      await screen.findByRole("tab", { name: "Reports, 4 waiting" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Pack approvals" }),
    ).toBeInTheDocument();
  });

  it("redirects home for an authenticated non-staff user, fetching nothing", async () => {
    signedInAs(PLAIN_USER);
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(
      screen.queryByRole("tab", { name: /Reports/ }),
    ).not.toBeInTheDocument();
    // Not just hidden: a non-staff viewer must not reach the staff endpoints at
    // all, so neither the queue nor the counts may be requested.
    expect(vi.mocked(reportsClient.list)).not.toHaveBeenCalled();
    expect(vi.mocked(moderationClient.counts)).not.toHaveBeenCalled();
  });

  it("shows a login prompt when unauthenticated", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <ModerationPanel />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("You need to be logged in to view this page."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(push).toHaveBeenCalledWith("/auth?next=%2Fmoderation");
  });
});
