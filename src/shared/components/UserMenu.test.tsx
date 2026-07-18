import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import messages from "@/messages/en.json";
import { UserMenu } from "./UserMenu";
import type { User } from "@/src/shared/types/user";

const USER: User = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function withIntl(ui: ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("UserMenu", () => {
  it("shows only the initial-letter trigger when closed", () => {
    render(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toHaveTextContent("A");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu on click, showing the username (not the email) and nav links", async () => {
    const user = userEvent.setup();
    render(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));

    await user.click(screen.getByRole("button", { name: "Account menu" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    // Email is intentionally not surfaced in the account menu.
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs",
    );
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("links to the profile page", async () => {
    const user = userEvent.setup();
    render(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    // Straight to the merged profile route (/users/[id]), not the /profile
    // redirect hop.
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/users/u1",
    );
  });

  it("renders a decorative icon on each menu item", async () => {
    const user = userEvent.setup();
    render(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));
    await user.click(screen.getByRole("button", { name: "Account menu" }));

    // Profile, Docs, Settings, Log out for a plain user — each leads with an
    // aria-hidden lucide <svg>, so the accessible name (asserted elsewhere)
    // stays the label alone.
    for (const name of ["Profile", "Docs", "Settings", "Log out"]) {
      const item = screen.getByRole("menuitem", { name });
      const icon = item.querySelector("svg");
      expect(icon, `${name} should have an icon`).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden");
    }
  });

  it("shows an Admin link for a manager/admin role but not for a plain user", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      withIntl(
        <UserMenu user={{ ...USER, role: "manager" }} onLogout={vi.fn()} />,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );

    rerender(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));
    expect(
      screen.queryByRole("menuitem", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  // Reports and pack approvals are tabs of one panel now, so the menu offers a
  // single Moderation link — a lingering Support link would be a second door
  // into the same room.
  it("no longer offers a separate Support link", async () => {
    const user = userEvent.setup();
    render(
      withIntl(
        <UserMenu user={{ ...USER, role: "moderator" }} onLogout={vi.fn()} />,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Account menu" }));

    expect(
      screen.queryByRole("menuitem", { name: "Support" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Moderation link for moderator+ but not for a plain user", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      withIntl(
        <UserMenu user={{ ...USER, role: "moderator" }} onLogout={vi.fn()} />,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(
      screen.getByRole("menuitem", { name: "Moderation" }),
    ).toHaveAttribute("href", "/moderation");

    rerender(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));
    expect(
      screen.queryByRole("menuitem", { name: "Moderation" }),
    ).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      withIntl(
        <div>
          <UserMenu user={USER} onLogout={vi.fn()} />
          <div data-testid="outside">outside</div>
        </div>,
      ),
    );

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onLogout and closes the menu when Log out is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(withIntl(<UserMenu user={USER} onLogout={onLogout} />));

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));

    const trigger = screen.getByRole("button", { name: "Account menu" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the trigger after logging out", async () => {
    const user = userEvent.setup();
    render(withIntl(<UserMenu user={USER} onLogout={vi.fn()} />));

    const trigger = screen.getByRole("button", { name: "Account menu" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(trigger).toHaveFocus();
  });
});
