import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsSection } from "./NotificationsSection";
import { notificationsClient } from "@/src/shared/lib/notifications-client";

vi.mock("@/src/shared/lib/notifications-client");
const mockedClient = vi.mocked(notificationsClient);

const ALL_ON = {
  new_follower: true,
  new_pack_from_followed: true,
  new_comment: true,
  pack_deleted_warning: true,
};

describe("NotificationsSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedClient.getPreferences.mockResolvedValue(ALL_ON);
  });

  it("renders all four toggles in their fetched state", async () => {
    render(<NotificationsSection />);
    await waitFor(() => expect(screen.getByRole("switch", { name: "New follower" })).toBeInTheDocument());
    expect(screen.getByRole("switch", { name: "New pack from someone you follow" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "New comment on your pack" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Pack removed by a moderator" })).toBeInTheDocument();
  });

  it("toggling one calls setPreferences with only that key", async () => {
    mockedClient.setPreferences.mockResolvedValue({ ...ALL_ON, new_comment: false });
    render(<NotificationsSection />);
    await waitFor(() => expect(screen.getByRole("switch", { name: "New comment on your pack" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("switch", { name: "New comment on your pack" }));
    expect(mockedClient.setPreferences).toHaveBeenCalledWith({ new_comment: false });
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "New comment on your pack" })).toHaveAttribute("aria-checked", "false"),
    );
  });

  it("a failed toggle reverts to the prior state, shows a per-row error, and does not affect other toggles", async () => {
    mockedClient.setPreferences.mockRejectedValue(new Error("network"));
    render(<NotificationsSection />);
    await waitFor(() => expect(screen.getByRole("switch", { name: "New comment on your pack" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("switch", { name: "New comment on your pack" }));
    await waitFor(() => expect(screen.getByText(/couldn't update/i)).toBeInTheDocument());
    expect(screen.getByRole("switch", { name: "New comment on your pack" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "New follower" })).toHaveAttribute("aria-checked", "true");
  });
});
