import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { RoleSelect } from "./RoleSelect";

// The control is the app's listbox Dropdown, not a native <select>: its options
// only exist in the DOM while the panel is open, so every option assertion here
// opens the trigger first.
describe("RoleSelect", () => {
  it("renders a gated dropdown an admin can use to promote a plain user", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RoleSelect
        actorRole="admin"
        targetRole="user"
        ariaLabel="Change role for bob"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("combobox", { name: "Change role for bob" }),
    );
    // Promotable targets only; 'admin' is never grantable through the UI.
    expect(
      screen.getByRole("option", { name: "moderator" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "manager" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "admin" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "moderator" }));
    expect(onChange).toHaveBeenCalledWith("moderator");
  });

  it("keeps the current role as a disabled selected option so the control isn't blank", async () => {
    const user = userEvent.setup();
    render(
      <RoleSelect
        actorRole="admin"
        targetRole="moderator"
        ariaLabel="Change role for mod"
        onChange={vi.fn()}
      />,
    );

    // The trigger shows the current role even before anything is opened.
    expect(screen.getByRole("combobox")).toHaveTextContent("moderator");

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "moderator" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("shows a static badge (no dropdown) when the actor cannot act on the target", () => {
    render(
      <RoleSelect
        actorRole="admin"
        targetRole="admin"
        ariaLabel="Change role for peer"
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("disables the dropdown while a change is pending", () => {
    render(
      <RoleSelect
        actorRole="admin"
        targetRole="user"
        ariaLabel="Change role for bob"
        pending
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("does not fire onChange when the current role is re-picked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RoleSelect
        actorRole="admin"
        targetRole="user"
        ariaLabel="Change role for bob"
        onChange={onChange}
      />,
    );

    await pickFromDropdown(user, "Change role for bob", "user");
    expect(onChange).not.toHaveBeenCalled();
  });
});
