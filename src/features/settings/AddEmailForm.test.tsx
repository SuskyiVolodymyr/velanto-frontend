import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AddEmailForm } from "./AddEmailForm";
import { authClient } from "@/src/shared/lib/auth-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { requestEmailCode: vi.fn(), addEmail: vi.fn() },
}));

const mockedRequest = vi.mocked(authClient.requestEmailCode);
const mockedAdd = vi.mocked(authClient.addEmail);
const patchUser = vi.fn();

const EMAIL = "new@example.com";

async function sendCode() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email address"), EMAIL);
  await user.click(screen.getByRole("button", { name: "Send code" }));
}

describe("AddEmailForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ patchUser } as unknown as ReturnType<
      typeof useAuth
    >);
  });

  it("requests a code and reveals the verification step", async () => {
    mockedRequest.mockResolvedValue({ sent: true });
    render(<AddEmailForm />);

    await sendCode();

    await waitFor(() => expect(mockedRequest).toHaveBeenCalledWith(EMAIL));
    expect(
      await screen.findByLabelText("Verification code"),
    ).toBeInTheDocument();
  });

  it("adds the email once the code is confirmed", async () => {
    const user = userEvent.setup();
    mockedRequest.mockResolvedValue({ sent: true });
    mockedAdd.mockResolvedValue({ email: EMAIL });
    render(<AddEmailForm />);

    await sendCode();
    await screen.findByLabelText("Verification code");

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Add email" }));

    await waitFor(() =>
      expect(mockedAdd).toHaveBeenCalledWith(EMAIL, "123456"),
    );
    expect(patchUser).toHaveBeenCalledWith({ email: EMAIL });
  });

  it("shows the taken message when the email belongs to another account", async () => {
    const user = userEvent.setup();
    mockedRequest.mockResolvedValue({ sent: true });
    mockedAdd.mockRejectedValue(new ApiError(403, "taken", null));
    render(<AddEmailForm />);

    await sendCode();
    await screen.findByLabelText("Verification code");

    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Add email" }));

    expect(
      await screen.findByText("That email is already used by another account."),
    ).toBeInTheDocument();
  });
});
