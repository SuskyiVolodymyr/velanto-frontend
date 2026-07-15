import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PasswordSection } from "./PasswordSection";
import { authClient } from "@/src/shared/lib/auth-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { changePassword: vi.fn() },
}));

const mockedChange = vi.mocked(authClient.changePassword);

function authAs(status: "authenticated" | "unauthenticated") {
  vi.mocked(useAuth).mockReturnValue({ status } as unknown as ReturnType<
    typeof useAuth
  >);
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Current password"), "OldPassw0rd");
  await user.type(screen.getByLabelText("New password"), "NewPassw0rd");
  await user.type(screen.getByLabelText("Confirm new password"), "NewPassw0rd");
  await user.click(screen.getByRole("button", { name: /change password/i }));
}

describe("PasswordSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prompts to log in when signed out", () => {
    authAs("unauthenticated");
    render(<PasswordSection />);
    expect(
      screen.getByText(/log in to change your password/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Current password"),
    ).not.toBeInTheDocument();
  });

  it("changes the password and confirms success", async () => {
    authAs("authenticated");
    mockedChange.mockResolvedValue({ changed: true });
    render(<PasswordSection />);

    await fillAndSubmit();

    await waitFor(() =>
      expect(mockedChange).toHaveBeenCalledWith({
        currentPassword: "OldPassw0rd",
        newPassword: "NewPassw0rd",
      }),
    );
    expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
  });

  it("shows a specific message when the current password is wrong (400)", async () => {
    authAs("authenticated");
    mockedChange.mockRejectedValue(new ApiError(400, "bad", null));
    render(<PasswordSection />);

    await fillAndSubmit();

    expect(
      await screen.findByText(/current password is incorrect/i),
    ).toBeInTheDocument();
  });
});
