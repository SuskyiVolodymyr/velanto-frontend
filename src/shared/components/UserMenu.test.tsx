import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "./UserMenu";
import type { User } from "@/src/shared/types/user";

const USER: User = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("UserMenu", () => {
  it("shows only the initial-letter trigger when closed", () => {
    render(<UserMenu user={USER} onLogout={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveTextContent("A");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu on click, showing username/email and nav links", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={USER} onLogout={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Account menu" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Docs" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("links to the profile page", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={USER} onLogout={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });

  it("shows an Admin link for a manager/admin role but not for a plain user", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<UserMenu user={{ ...USER, role: "manager" }} onLogout={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute("href", "/admin");

    rerender(<UserMenu user={USER} onLogout={vi.fn()} />);
    expect(screen.queryByRole("menuitem", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows a Support link for moderator+ but not for a plain user", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<UserMenu user={{ ...USER, role: "moderator" }} onLogout={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Support" })).toHaveAttribute("href", "/support");

    rerender(<UserMenu user={USER} onLogout={vi.fn()} />);
    expect(screen.queryByRole("menuitem", { name: "Support" })).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <UserMenu user={USER} onLogout={vi.fn()} />
        <div data-testid="outside">outside</div>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onLogout and closes the menu when Log out is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<UserMenu user={USER} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={USER} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the trigger after logging out", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={USER} onLogout={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(trigger).toHaveFocus();
  });
});
