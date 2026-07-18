import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { SetPasswordSection } from "./SetPasswordSection";
import { authClient } from "@/src/shared/lib/auth-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { setPassword: vi.fn() },
}));

const mockedSet = vi.mocked(authClient.setPassword);
const patchUser = vi.fn();

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("New password"), "NewPassw0rd");
  await user.type(screen.getByLabelText("Confirm new password"), "NewPassw0rd");
  await user.click(screen.getByRole("button", { name: "Set password" }));
}

describe("SetPasswordSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ patchUser } as unknown as ReturnType<
      typeof useAuth
    >);
  });

  it("sets the password and flips the account to having one", async () => {
    mockedSet.mockResolvedValue({ set: true });
    render(<SetPasswordSection />);

    await fillAndSubmit();

    await waitFor(() => expect(mockedSet).toHaveBeenCalledWith("NewPassw0rd"));
    expect(patchUser).toHaveBeenCalledWith({ hasPassword: true });
  });

  it("shows an error message when setting the password fails", async () => {
    mockedSet.mockRejectedValue(new Error("nope"));
    render(<SetPasswordSection />);

    await fillAndSubmit();

    expect(
      await screen.findByText(/couldn.t set your password/i),
    ).toBeInTheDocument();
  });
});
