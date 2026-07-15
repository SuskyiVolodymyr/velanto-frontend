import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import AppError from "./error";

describe("app error boundary", () => {
  it("shows a recoverable error screen and calls reset on Try again", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    // The boundary logs the error on mount by design; silence it so the test
    // output stays clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AppError error={new Error("boom")} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
