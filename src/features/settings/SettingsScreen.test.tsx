import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { SettingsScreen } from "./SettingsScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn().mockRejectedValue(new Error("no session")),
  },
}));

describe("SettingsScreen", () => {
  it("renders the Preferences heading and both sections", async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <AuthProvider>
            <StreamerModeProvider>
              <SettingsScreen />
            </StreamerModeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Preferences" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Accent color")).toBeInTheDocument();
    // Both NotificationsSection and AccountSection show their own "Log in"
    // prompt while unauthenticated.
    expect(
      await screen.findByText(/to manage notification preferences/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/to view account settings/i)).toBeInTheDocument();
  });
});
