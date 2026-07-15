import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { authClient } from "@/src/shared/lib/auth-client";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const mockedRequest = vi.mocked(authClient.requestPasswordReset);
const mockedReset = vi.mocked(authClient.resetPassword);

describe("ForgotPasswordForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests a code, advances to the confirm step, and prefills a dev code", async () => {
    mockedRequest.mockResolvedValue({ sent: true, devCode: "123456" });
    const user = userEvent.setup();
    render(<ForgotPasswordForm onBackToLogin={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith("alice@example.com"),
    );
    // Confirm step: the code field appears, prefilled with the dev code.
    const code = await screen.findByLabelText(/reset code/i);
    expect(code).toHaveValue("123456");
    // The email is now locked to the address we requested for.
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
  });

  it("submits the new password and shows the success state", async () => {
    mockedRequest.mockResolvedValue({ sent: true, devCode: "123456" });
    mockedReset.mockResolvedValue({ reset: true });
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <ForgotPasswordForm
        initialEmail="alice@example.com"
        onBackToLogin={onBack}
      />,
    );

    await user.click(screen.getByRole("button", { name: /send reset code/i }));
    await screen.findByLabelText(/reset code/i);

    await user.type(screen.getByLabelText("New password"), "NewPassw0rd");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "NewPassw0rd",
    );
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    await waitFor(() =>
      expect(mockedReset).toHaveBeenCalledWith({
        email: "alice@example.com",
        code: "123456",
        newPassword: "NewPassw0rd",
      }),
    );
    expect(
      await screen.findByText(/your password has been reset/i),
    ).toBeInTheDocument();
  });

  it("surfaces an error when the code is wrong", async () => {
    mockedRequest.mockResolvedValue({ sent: true, devCode: "123456" });
    mockedReset.mockRejectedValue(new Error("bad code"));
    const user = userEvent.setup();
    render(
      <ForgotPasswordForm
        initialEmail="alice@example.com"
        onBackToLogin={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /send reset code/i }));
    await screen.findByLabelText(/reset code/i);
    await user.type(screen.getByLabelText("New password"), "NewPassw0rd");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "NewPassw0rd",
    );
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    expect(
      await screen.findByText(/couldn.t reset your password/i),
    ).toBeInTheDocument();
  });
});
