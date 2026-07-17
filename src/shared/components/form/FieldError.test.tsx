import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldError } from "./FieldError";

describe("FieldError", () => {
  it("announces the message with the id the control points at", () => {
    render(<FieldError id="email-error">Email is required.</FieldError>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("id", "email-error");
    expect(alert).toHaveTextContent("Email is required.");
  });

  it("marks the message with an icon", () => {
    render(<FieldError id="email-error">Email is required.</FieldError>);
    expect(screen.getByRole("alert").querySelector("svg")).toBeInTheDocument();
  });

  // The icon is decoration: role="alert" already announces this node and the
  // message already says what is wrong. An unlabelled svg would be read as
  // noise or dropped depending on the reader — aria-hidden makes it deliberate.
  it("hides the icon from assistive tech", () => {
    render(<FieldError id="email-error">Email is required.</FieldError>);
    expect(screen.getByRole("alert").querySelector("svg")).toHaveAttribute(
      "aria-hidden",
    );
  });

  // aria-describedby points here, so a focused control reads this node out.
  // If the icon ever leaked a name, the user would hear it before the message.
  it("announces only the message text", () => {
    render(<FieldError id="email-error">Email is required.</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent(/^Email is required\.$/);
  });

  /**
   * #236. `cn()` is a plain join, not tailwind-merge, so a colour passed via
   * className would be appended to Text's variant colour rather than replacing
   * it — and lose the cascade. Measured in a browser: text-danger alone is
   * rgb(255,107,107); text-foreground text-danger is rgb(243,245,248) in EITHER
   * order. Every error in the app rendered near-white and looked correct in the
   * source. Asserting the emitted colour set is the only check that catches it.
   */
  it("carries exactly one colour class, so the danger red cannot be shadowed", () => {
    render(<FieldError id="email-error">Email is required.</FieldError>);

    const colors = screen
      .getByRole("alert")
      .className.split(/\s+/)
      .filter((c) => c.startsWith("text-") && !/^text-(sm|xs|base|lg)$/.test(c));

    expect(colors).toEqual(["text-danger"]);
  });
});
