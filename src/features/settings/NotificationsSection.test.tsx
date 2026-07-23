import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsSection } from "./NotificationsSection";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/notifications-client");
vi.mock("@/src/shared/lib/auth-context");

const mockedClient = vi.mocked(notificationsClient);
const mockedUseAuth = vi.mocked(useAuth);

const ALL_ON = {
  new_follower: true,
  new_pack_from_followed: true,
  new_comment: true,
  comment_mention: true,
  comment_reply: true,
  pack_deleted_warning: true,
};

function mockAuth(status: "authenticated" | "unauthenticated" | "loading") {
  mockedUseAuth.mockReturnValue({
    user:
      status === "authenticated"
        ? {
            id: "u1",
            email: "a@x.com",
            username: "alice",
            role: "user",
            createdAt: "",
          }
        : null,
    status,
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
    revalidate: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("NotificationsSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth("authenticated");
    mockedClient.getPreferences.mockResolvedValue(ALL_ON);
  });

  it("shows a login prompt when unauthenticated, without calling getPreferences", async () => {
    mockAuth("unauthenticated");
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByText(/manage notification preferences/i),
      ).toBeInTheDocument(),
    );
    expect(mockedClient.getPreferences).not.toHaveBeenCalled();
  });

  it("shows an error message when the initial preferences fetch fails", async () => {
    mockedClient.getPreferences.mockRejectedValue(new Error("network"));
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load your notification preferences/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows skeleton rows while preferences are loading", () => {
    // A never-resolving fetch keeps the query in its loading state.
    mockedClient.getPreferences.mockReturnValue(new Promise<never>(() => {}));
    const { container } = render(<NotificationsSection />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
    // No toggles yet — the skeletons stand in for them.
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("renders a toggle per notification type in its fetched state", async () => {
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New follower" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("switch", { name: "New pack from someone you follow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Someone replied to your comment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Pack removed by a moderator" }),
    ).toBeInTheDocument();
  });

  it("toggling one calls setPreferences with only that key", async () => {
    mockedClient.setPreferences.mockResolvedValue({
      ...ALL_ON,
      new_comment: false,
    });
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New comment on your pack" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    );
    expect(mockedClient.setPreferences).toHaveBeenCalledWith({
      new_comment: false,
    });
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New comment on your pack" }),
      ).toHaveAttribute("aria-checked", "false"),
    );
  });

  it("a failed toggle reverts to the prior state, shows a per-row error, and does not affect other toggles", async () => {
    mockedClient.setPreferences.mockRejectedValue(new Error("network"));
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New comment on your pack" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/couldn't update/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: "New follower" }),
    ).toHaveAttribute("aria-checked", "true");
  });
});
