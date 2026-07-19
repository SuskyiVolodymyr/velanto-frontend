import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleSelect } from "./RoleSelect";

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

    const select = screen.getByRole("combobox", {
      name: "Change role for bob",
    });
    // Promotable targets only; 'admin' is never grantable through the UI.
    expect(
      screen.getByRole("option", { name: "moderator" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "manager" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "admin" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(select, "moderator");
    expect(onChange).toHaveBeenCalledWith("moderator");
  });

  it("keeps the current role as a disabled selected option so the control isn't blank", () => {
    render(
      <RoleSelect
        actorRole="admin"
        targetRole="moderator"
        ariaLabel="Change role for mod"
        onChange={vi.fn()}
      />,
    );

    const current = screen.getByRole("option", {
      name: "moderator",
    }) as HTMLOptionElement;
    expect(current.disabled).toBe(true);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "moderator",
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
});
