import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("associates the label with the control via htmlFor/id", () => {
    render(
      <FormField htmlFor="email" label="Email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("does not render an error node when no error is given", () => {
    render(
      <FormField htmlFor="email" label="Email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the error with role=alert and an id derived from htmlFor", () => {
    render(
      <FormField htmlFor="email" label="Email" error="Email is required.">
        <input id="email" />
      </FormField>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Email is required.");
    expect(alert).toHaveAttribute("id", "email-error");
  });

  it("keeps the label accessible but visually hidden when srOnlyLabel is set", () => {
    render(
      <FormField htmlFor="email" label="Email" srOnlyLabel>
        <input id="email" />
      </FormField>,
    );
    // Still discoverable by its accessible name for screen readers / queries.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("Email")).toHaveClass("sr-only");
  });
});
