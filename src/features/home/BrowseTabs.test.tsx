import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { BrowseTabs } from "./BrowseTabs";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

// Stub the two panels so the tab test doesn't drag in their data fetching.
vi.mock("@/src/features/home/HomeFeed", () => ({
  HomeFeed: () => <div>PACKS_PANEL</div>,
}));
vi.mock("@/src/features/home/MyPacksFeed", () => ({
  MyPacksFeed: () => <div>MY_PACKS_PANEL</div>,
}));

function mockSignedIn() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: {
      id: "u1",
      email: "a@example.com",
      username: "alice",
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  });
}

function mockSignedOut() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
}

function renderTabs() {
  return render(
    <AuthProvider>
      <BrowseTabs />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BrowseTabs", () => {
  it("hides the My packs tab from signed-out visitors and shows the packs panel", async () => {
    mockSignedOut();
    renderTabs();

    await waitFor(() => expect(authClient.refresh).toHaveBeenCalled());
    expect(screen.getByRole("tab", { name: "Packs" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "My packs" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("PACKS_PANEL")).toBeInTheDocument();
  });

  it("shows the My packs tab to a signed-in user and switches to it on click", async () => {
    mockSignedIn();
    renderTabs();

    const mineTab = await screen.findByRole("tab", { name: "My packs" });
    expect(screen.getByText("PACKS_PANEL")).toBeInTheDocument();

    await userEvent.click(mineTab);

    expect(screen.getByText("MY_PACKS_PANEL")).toBeInTheDocument();
    expect(screen.queryByText("PACKS_PANEL")).not.toBeInTheDocument();
  });
});
