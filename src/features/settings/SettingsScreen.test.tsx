import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsScreen } from "./SettingsScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";

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
      <AuthProvider>
        <SettingsScreen />
      </AuthProvider>,
    );

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByText("Accent color")).toBeInTheDocument();
    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
  });
});
