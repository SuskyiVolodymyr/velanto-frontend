import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { PrivacySection } from "./PrivacySection";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import type { MyProfile } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("@/src/shared/lib/users-client");

const STORAGE_KEY = "velanto:streamer-mode";
const mockedUseAuth = vi.mocked(useAuth);
const mockedUsersClient = vi.mocked(usersClient);

function mockAuth(status: "authenticated" | "unauthenticated") {
  mockedUseAuth.mockReturnValue({
    status,
    user: status === "authenticated" ? { id: "u1" } : null,
  } as ReturnType<typeof useAuth>);
}

function renderPrivacySection() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <StreamerModeProvider>
          <PrivacySection />
        </StreamerModeProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("PrivacySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-streamer-mode");
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
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-streamer-mode");
  });

  it("renders the streamer-mode control defaulting to Off", () => {
    renderPrivacySection();
    expect(screen.getByText("Streamer mode")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Off", checked: true }),
    ).toBeInTheDocument();
  });

  it("enables streamer mode and persists it when On is chosen", async () => {
    const user = userEvent.setup();
    renderPrivacySection();

    // Two "On" radios once the play-history card loads; the streamer-mode one is
    // in the first group. Scope to it via its group's accessible name.
    const streamerGroup = screen.getByRole("radiogroup", {
      name: "Streamer mode",
    });
    await user.click(within(streamerGroup).getByRole("radio", { name: "On" }));

    expect(
      within(streamerGroup).getByRole("radio", { name: "On", checked: true }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("on");
  });

  it("shows the play-history control for an authed user and toggles it off", async () => {
    const user = userEvent.setup();
    renderPrivacySection();

    const group = await screen.findByRole("radiogroup", {
      name: "Show play history",
    });
    // Loads reflecting the server value (public → On).
    expect(
      within(group).getByRole("radio", { name: "On", checked: true }),
    ).toBeInTheDocument();

    await user.click(within(group).getByRole("radio", { name: "Off" }));

    expect(mockedUsersClient.updatePreferences).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(
        within(group).getByRole("radio", { name: "Off", checked: true }),
      ).toBeInTheDocument(),
    );
  });

  it("hides the play-history control for a signed-out visitor", () => {
    mockAuth("unauthenticated");
    renderPrivacySection();
    expect(
      screen.queryByRole("radiogroup", { name: "Show play history" }),
    ).not.toBeInTheDocument();
    expect(mockedUsersClient.getMe).not.toHaveBeenCalled();
  });
});
