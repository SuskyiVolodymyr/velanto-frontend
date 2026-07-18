import { render, screen, act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/src/shared/types/user";

// Capture the callbacks AuthProvider hands to the api-client so we can drive
// them the way a silent 401-refresh would, and assert the provider reacts.
let captured: {
  onRefreshed: (user: User) => void;
  onLost: () => void;
} | null = null;

const setAccessToken = vi.fn();
vi.mock("@/src/shared/lib/api-client", () => ({
  setAccessToken: (...args: unknown[]) => setAccessToken(...args),
  setSessionCallbacks: (cb: typeof captured) => {
    captured = cb;
  },
}));

const refresh = vi.fn();
vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { refresh: () => refresh() },
}));

vi.mock("@/src/shared/lib/sentry-reporting", () => ({
  setSentryUser: vi.fn(),
}));

import { AuthProvider, useAuth } from "@/src/shared/lib/auth-context";

function Probe() {
  const { status, user } = useAuth();
  return (
    <div data-testid="probe">{`${status}:${user?.username ?? "none"}`}</div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const probeText = () => screen.getByTestId("probe").textContent;

afterEach(() => {
  captured = null;
  refresh.mockReset();
  setAccessToken.mockReset();
});

describe("AuthProvider session-callback wiring", () => {
  it("drops to unauthenticated when the api-client reports the session lost", async () => {
    refresh.mockResolvedValue({
      accessToken: "t",
      user: { id: "u1", username: "vova" } as User,
    });
    renderProvider();
    await waitFor(() => expect(probeText()).toBe("authenticated:vova"));

    act(() => captured!.onLost());

    await waitFor(() => expect(probeText()).toBe("unauthenticated:none"));
  });

  it("adopts the refreshed user when the api-client silently renews the token", async () => {
    refresh.mockRejectedValue(new Error("no session"));
    renderProvider();
    await waitFor(() => expect(probeText()).toBe("unauthenticated:none"));

    act(() => captured!.onRefreshed({ id: "u2", username: "neo" } as User));

    await waitFor(() => expect(probeText()).toBe("authenticated:neo"));
  });
});
