import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { OAuthButtons } from "./OAuthButtons";
import { authClient } from "@/src/shared/lib/auth-client";

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: { oauthProviders: vi.fn() },
}));

const mockedProviders = vi.mocked(authClient.oauthProviders);

describe("OAuthButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders both provider links when both are configured", async () => {
    mockedProviders.mockResolvedValue({ google: true, discord: true });
    render(<OAuthButtons />);

    const google = await screen.findByRole("link", {
      name: "Continue with Google",
    });
    expect(google).toHaveAttribute("href", "http://localhost:3001/auth/google");

    const discord = await screen.findByRole("link", {
      name: "Continue with Discord",
    });
    expect(discord).toHaveAttribute(
      "href",
      "http://localhost:3001/auth/discord",
    );
  });

  it("renders nothing when no provider is configured", async () => {
    mockedProviders.mockResolvedValue({ google: false, discord: false });
    render(<OAuthButtons />);

    // The fetch resolves in an effect; wait for it to have been consumed.
    await waitFor(() => expect(mockedProviders).toHaveBeenCalled());

    expect(
      screen.queryByRole("link", { name: "Continue with Google" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Continue with Discord" }),
    ).toBeNull();
  });

  it("renders only the Google link when Discord is disabled", async () => {
    mockedProviders.mockResolvedValue({ google: true, discord: false });
    render(<OAuthButtons />);

    const google = await screen.findByRole("link", {
      name: "Continue with Google",
    });
    expect(google).toHaveAttribute("href", "http://localhost:3001/auth/google");
    expect(
      screen.queryByRole("link", { name: "Continue with Discord" }),
    ).toBeNull();
  });
});
