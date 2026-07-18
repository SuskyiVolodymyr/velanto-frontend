import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AccountSection } from "./AccountSection";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import type { User } from "@/src/shared/types/user";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

const USER: User = {
  id: "u1",
  email: "alice@example.com",
  username: "alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderAsAuthenticated() {
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "token",
    user: USER,
  });
  return render(
    <AuthProvider>
      <AccountSection />
    </AuthProvider>,
  );
}

function renderAsUnauthenticated() {
  vi.mocked(authClient.refresh).mockRejectedValue(new Error("no session"));
  return render(
    <AuthProvider>
      <AccountSection />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountSection", () => {
  it("shows the user's email and the account-email label when authenticated", async () => {
    renderAsAuthenticated();
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Your account email")).toBeInTheDocument();
  });

  it("shows a log-in prompt when unauthenticated", async () => {
    renderAsUnauthenticated();
    expect(await screen.findByText(/log in/i)).toBeInTheDocument();
    expect(screen.queryByText("Your account email")).not.toBeInTheDocument();
  });
});
