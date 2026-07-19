import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { NotificationsScreen } from "./NotificationsScreen";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useNotifications } from "@/src/shared/components/use-notifications";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("@/src/shared/components/use-notifications");
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseNotifications = vi.mocked(useNotifications);

function mockAuth(status: "authenticated" | "unauthenticated" | "loading") {
  mockedUseAuth.mockReturnValue({ status } as ReturnType<typeof useAuth>);
}

function mockNotifications(
  overrides: Partial<ReturnType<typeof useNotifications>> = {},
) {
  mockedUseNotifications.mockReturnValue({
    notifications: [],
    total: 0,
    listLoading: false,
    listError: null,
    listReady: true,
    loadingMore: false,
    loadMoreError: "",
    handleLoadMore: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useNotifications>);
}

describe("NotificationsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications();
  });

  it("fetches unconditionally (alwaysOpen) — not gated on a drawer being open", () => {
    mockAuth("authenticated");
    render(<NotificationsScreen />);
    expect(mockedUseNotifications).toHaveBeenCalledWith({ alwaysOpen: true });
  });

  it("renders the notifications for a signed-in viewer", () => {
    mockAuth("authenticated");
    mockNotifications({
      notifications: [
        {
          id: "n1",
          type: "new_follower",
          read: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          payload: { followerUsername: "bob", followerId: "u2" },
        },
      ] as unknown as ReturnType<typeof useNotifications>["notifications"],
      total: 1,
    });
    render(<NotificationsScreen />);
    expect(screen.getByText("@bob")).toBeInTheDocument();
  });

  it("renders nothing and does NOT redirect while auth is still loading", () => {
    mockAuth("loading");
    const { container } = render(<NotificationsScreen />);
    expect(container).toBeEmptyDOMElement();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a definitively signed-out visitor to /auth", () => {
    mockAuth("unauthenticated");
    render(<NotificationsScreen />);
    expect(replace).toHaveBeenCalledWith("/auth");
  });
});
