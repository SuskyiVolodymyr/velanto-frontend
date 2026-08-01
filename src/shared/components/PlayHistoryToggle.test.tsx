import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayHistoryToggle } from "./PlayHistoryToggle";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import type { MyProfile } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("@/src/shared/lib/users-client");

const mockedUseAuth = vi.mocked(useAuth);
const mockedUsersClient = vi.mocked(usersClient);

function mockAuth(status: "authenticated" | "unauthenticated") {
  mockedUseAuth.mockReturnValue({
    status,
    user: status === "authenticated" ? { id: "u1" } : null,
  } as ReturnType<typeof useAuth>);
}

describe("PlayHistoryToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth("authenticated");
    mockedUsersClient.getMe.mockResolvedValue({
      id: "u1",
      username: "alice",
      email: "a@x.com",
      showPlayHistory: true,
    } as MyProfile);
    mockedUsersClient.updatePreferences.mockResolvedValue({
      showPlayHistory: false,
    });
  });

  it("renders the play-history control for an authed user, reflecting the server value", async () => {
    render(<PlayHistoryToggle />);

    const group = await screen.findByRole("radiogroup", {
      name: "Show play history",
    });
    expect(
      within(group).getByRole("radio", { name: "On", checked: true }),
    ).toBeInTheDocument();
  });

  it("toggles the shared showPlayHistory mutation off", async () => {
    const user = userEvent.setup();
    render(<PlayHistoryToggle />);

    const group = await screen.findByRole("radiogroup", {
      name: "Show play history",
    });
    await user.click(within(group).getByRole("radio", { name: "Off" }));

    expect(mockedUsersClient.updatePreferences).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(
        within(group).getByRole("radio", { name: "Off", checked: true }),
      ).toBeInTheDocument(),
    );
  });

  it("renders nothing for a signed-out visitor", () => {
    mockAuth("unauthenticated");
    const { container } = render(<PlayHistoryToggle />);
    expect(container).toBeEmptyDOMElement();
    expect(mockedUsersClient.getMe).not.toHaveBeenCalled();
  });
});
