import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { DangerZoneSection } from "./DangerZoneSection";
import { authClient } from "@/src/shared/lib/auth-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { deleteAccount: vi.fn(), exportMyData: vi.fn() },
}));

const mockedDelete = vi.mocked(authClient.deleteAccount);
const mockedExport = vi.mocked(authClient.exportMyData);
const logout = vi.fn().mockResolvedValue(undefined);

function authAs(status: "authenticated" | "unauthenticated") {
  vi.mocked(useAuth).mockReturnValue({
    status,
    logout,
  } as unknown as ReturnType<typeof useAuth>);
}

describe("DangerZoneSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom lacks object-URL APIs used by the export download.
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
  });

  it("renders nothing when signed out", () => {
    authAs("unauthenticated");
    const { container } = render(<DangerZoneSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exports the user's data on demand", async () => {
    authAs("authenticated");
    mockedExport.mockResolvedValue({ profile: { id: "u1" } });
    render(<DangerZoneSection />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /download my data/i }));

    await waitFor(() => expect(mockedExport).toHaveBeenCalledTimes(1));
  });

  it("deletes the account, logs out, and redirects on success", async () => {
    authAs("authenticated");
    mockedDelete.mockResolvedValue({ deactivated: true });
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    // Open the confirm modal from the card's danger button.
    await user.click(screen.getByRole("button", { name: /delete account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(/confirm your password/i),
      "MyPassw0rd",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /delete account/i }),
    );

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith("MyPassw0rd"),
    );
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows a specific message when the password is wrong (400)", async () => {
    authAs("authenticated");
    mockedDelete.mockRejectedValue(new ApiError(400, "bad", null));
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(/confirm your password/i),
      "wrong",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /delete account/i }),
    );

    expect(
      await within(dialog).findByText(/that password is incorrect/i),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
