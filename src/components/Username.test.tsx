import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Username } from "./Username";

describe("Username", () => {
  it("renders a plain handle for a normal user (no gradient, no pill)", () => {
    render(<Username username="regular_sam" role="user" trusted={false} />);
    const name = screen.getByText("regular_sam");
    expect(name.className).not.toMatch(/nickname-/);
    expect(screen.queryByText(/TRUSTED|ADMIN|MANAGER|MODERATOR/)).toBeNull();
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
    // gradient/animation (defined on .nickname-gradient) never renders.
    render(<Username username="admin_max" role="admin" />);
    expect(screen.getByText("admin_max").className).toContain(
      "nickname-gradient",
    );
  });

  it("gives a trusted non-staff user the green trusted gradient", () => {
    render(<Username username="trusted_nova" role="user" trusted={true} />);
    const name = screen.getByText("trusted_nova");
    expect(name.className).toContain("nickname-trusted");
    expect(name.className).toContain("nickname-gradient");
  });

  it("applies no gradient class to a normal, untrusted user", () => {
    render(<Username username="regular_sam" role="user" trusted={false} />);
    expect(screen.getByText("regular_sam").className).not.toContain(
      "nickname-gradient",
    );
  });

  it("shows the ALL-CAPS role pill only when showRole is set", () => {
    const { rerender } = render(<Username username="admin_max" role="admin" />);
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();

    rerender(<Username username="admin_max" role="admin" showRole />);
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });

  it("shows a TRUSTED pill for a trusted non-staff user with showRole", () => {
    render(<Username username="trusted_nova" role="user" trusted showRole />);
    expect(screen.getByText("TRUSTED")).toBeInTheDocument();
  });

  it("shows no pill for a plain user even with showRole", () => {
    render(<Username username="regular_sam" role="user" showRole />);
    expect(
      screen.queryByText(/TRUSTED|ADMIN|MANAGER|MODERATOR/),
    ).not.toBeInTheDocument();
  });

  it("prepends @ when the at prop is set", () => {
    render(<Username username="admin_max" role="admin" at />);
    expect(screen.getByText("@admin_max")).toBeInTheDocument();
  });
});
