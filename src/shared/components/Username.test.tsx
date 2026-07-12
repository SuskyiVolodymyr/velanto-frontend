import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Username } from "./Username";

describe("Username", () => {
  it("renders a plain handle for a normal user (no gradient, no badge, no role)", () => {
    render(<Username username="regular_sam" role="user" trusted={false} />);
    const name = screen.getByText("regular_sam");
    expect(name.className).not.toMatch(/nickname-/);
    expect(screen.queryByLabelText("Trusted user")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("applies the role gradient class for each staff role", () => {
    const { rerender } = render(<Username username="a" role="admin" />);
    expect(screen.getByText("a").className).toContain("nickname-admin");

    rerender(<Username username="m" role="manager" />);
    expect(screen.getByText("m").className).toContain("nickname-manager");

    rerender(<Username username="k" role="moderator" />);
    expect(screen.getByText("k").className).toContain("nickname-moderator");
  });

  it("also applies the base nickname-gradient class for staff so the gradient renders", () => {
    // The per-role class only supplies colors; without the base class the
    // gradient/animation/glow (defined on .nickname-gradient) never renders.
    render(<Username username="admin_max" role="admin" />);
    expect(screen.getByText("admin_max").className).toContain(
      "nickname-gradient",
    );
  });

  it("applies no gradient class to a normal user", () => {
    render(<Username username="regular_sam" role="user" />);
    expect(screen.getByText("regular_sam").className).not.toContain(
      "nickname-gradient",
    );
  });

  it("shows the verified badge for staff (verified by default)", () => {
    render(<Username username="admin_max" role="admin" trusted={false} />);
    expect(screen.getByLabelText("Trusted user")).toBeInTheDocument();
  });

  it("shows the verified badge for a trusted non-staff user, without a gradient", () => {
    render(<Username username="trusted_nova" role="user" trusted={true} />);
    expect(screen.getByLabelText("Trusted user")).toBeInTheDocument();
    expect(screen.getByText("trusted_nova").className).not.toMatch(/nickname-/);
  });

  it("reveals the trusted tooltip on hover", async () => {
    const user = userEvent.setup();
    render(<Username username="admin_max" role="admin" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(screen.getByLabelText("Trusted user"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Trusted user",
    );
  });

  it("shows the role label only when showRole is set", () => {
    const { rerender } = render(<Username username="admin_max" role="admin" />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();

    rerender(<Username username="admin_max" role="admin" showRole />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("does not show a role label for non-staff even with showRole", () => {
    render(<Username username="regular_sam" role="user" showRole />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
    expect(screen.queryByText("Moderator")).not.toBeInTheDocument();
  });

  it("prepends @ when the at prop is set", () => {
    render(<Username username="admin_max" role="admin" at />);
    expect(screen.getByText("@admin_max")).toBeInTheDocument();
  });
});
